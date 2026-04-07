import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto } from './dto/coupon.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { DiscountType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async create(createCouponDto: CreateCouponDto): Promise<CouponResponseDto> {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrder,
      maximumDiscount,
      usageLimit,
      perUserLimit,
      startsAt,
      expiresAt,
      categoryIds,
    } = createCouponDto;

    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      throw new BadRequestException('Coupon code already exists');
    }

    const startsAtDate = new Date(startsAt);
    const expiresAtDate = new Date(expiresAt);

    if (expiresAtDate <= startsAtDate) {
      throw new BadRequestException('Expiration date must be after start date');
    }

    if (discountType === DiscountType.PERCENTAGE && discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minimumOrder,
        maximumDiscount,
        usageLimit,
        perUserLimit,
        startsAt: startsAtDate,
        expiresAt: expiresAtDate,
        ...(categoryIds && categoryIds.length > 0
          ? {
              categories: {
                create: categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              },
            }
          : {}),
      },
      include: {
        categories: {
          select: { categoryId: true },
        },
      },
    });

    return this.mapToResponseDto(coupon);
  }

  async findAll(query: CouponQueryDto): Promise<{
    coupons: CouponResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, discountType, isActive, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (discountType) {
      where.discountType = discountType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          categories: {
            select: { categoryId: true },
          },
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      coupons: coupons.map(this.mapToResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        categories: {
          select: { categoryId: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.mapToResponseDto(coupon);
  }

  async findByCode(code: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        categories: {
          select: { categoryId: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.mapToResponseDto(coupon);
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<CouponResponseDto> {
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!existingCoupon) {
      throw new NotFoundException('Coupon not found');
    }

    const { code, discountValue, discountType, startsAt, expiresAt, categoryIds, ...rest } = updateCouponDto;

    if (code && code.toUpperCase() !== existingCoupon.code) {
      const codeExists = await this.prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (codeExists) {
        throw new BadRequestException('Coupon code already exists');
      }
    }

    const data: any = {
      ...rest,
      ...(code ? { code: code.toUpperCase() } : {}),
    };

    if (discountValue !== undefined || discountType !== undefined) {
      const newDiscountType = discountType || existingCoupon.discountType;
      const newDiscountValue = Number(discountValue ?? existingCoupon.discountValue);

      if (newDiscountType === DiscountType.PERCENTAGE && newDiscountValue > 100) {
        throw new BadRequestException('Percentage discount cannot exceed 100%');
      }

      if (discountValue !== undefined) {
        data.discountValue = discountValue;
      }
      if (discountType !== undefined) {
        data.discountType = discountType;
      }
    }

    if (startsAt || expiresAt) {
      const startsAtDate = startsAt ? new Date(startsAt) : existingCoupon.startsAt;
      const expiresAtDate = expiresAt ? new Date(expiresAt) : existingCoupon.expiresAt;

      if (expiresAtDate <= startsAtDate) {
        throw new BadRequestException('Expiration date must be after start date');
      }

      if (startsAt) {
        data.startsAt = startsAtDate;
      }
      if (expiresAt) {
        data.expiresAt = expiresAtDate;
      }
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data,
      include: {
        categories: {
          select: { categoryId: true },
        },
      },
    });

    if (categoryIds !== undefined) {
      await this.prisma.couponCategory.deleteMany({
        where: { couponId: id },
      });

      if (categoryIds.length > 0) {
        await this.prisma.couponCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            couponId: id,
            categoryId,
          })),
        });
      }

      return this.findOne(id);
    }

    return this.mapToResponseDto(coupon);
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.couponCategory.deleteMany({
      where: { couponId: id },
    });

    await this.prisma.coupon.delete({
      where: { id },
    });
  }

  async toggleActive(id: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
      include: {
        categories: {
          select: { categoryId: true },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  async getStatistics(): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    totalUsage: number;
    averageDiscount: number;
  }> {
    const [totalCoupons, activeCoupons, totalUsage] = await Promise.all([
      this.prisma.coupon.count(),
      this.prisma.coupon.count({ where: { isActive: true } }),
      this.prisma.coupon.aggregate({
        _sum: { usedCount: true },
      }),
    ]);

    const avgResult = await this.prisma.coupon.aggregate({
      _avg: { discountValue: true },
    });

    return {
      totalCoupons,
      activeCoupons,
      totalUsage: totalUsage._sum.usedCount || 0,
      averageDiscount: Number(avgResult._avg.discountValue) || 0,
    };
  }

  private mapToResponseDto(coupon: any): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minimumOrder: coupon.minimumOrder ? Number(coupon.minimumOrder) : null,
      maximumDiscount: coupon.maximumDiscount ? Number(coupon.maximumDiscount) : null,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      perUserLimit: coupon.perUserLimit,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      categoryIds: coupon.categories?.map((c: any) => c.categoryId) || [],
    };
  }
}
