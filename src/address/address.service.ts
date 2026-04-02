import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { AddressQueryDto } from './dto/address-query.dto';
import { AddressType, Address } from '@prisma/client';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<Address> {
    const { isDefault, addressType, ...addressData } = createAddressDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If this is the first address for the user, make it default
    const addressCount = await this.prisma.address.count({
      where: { userId },
    });

    let shouldBeDefault = isDefault || false;

    if (addressCount === 0) {
      shouldBeDefault = true;
    }

    // If setting as default, remove default status from other addresses
    if (shouldBeDefault) {
      await this.prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // Create the address
    const address = await this.prisma.address.create({
      data: {
        ...addressData,
        userId,
        addressType: addressType || AddressType.SHIPPING,
        isDefault: shouldBeDefault,
      },
    });

    return address;
  }

  async findAll(userId: string, query: AddressQueryDto) {
    const { addressType, isDefault, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = { userId };

    if (addressType) {
      where.addressType = addressType;
    }

    if (isDefault !== undefined) {
      where.isDefault = isDefault;
    }

    // Get addresses with pagination
    const [addresses, total] = await Promise.all([
      this.prisma.address.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.address.count({ where }),
    ]);

    return {
      data: addresses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, addressId: string): Promise<Address> {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }

    return address;
  }

  async update(
    userId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {
    // Check if address exists and belongs to user
    await this.findOne(userId, addressId);

    const { isDefault, addressType, ...addressData } = updateAddressDto;

    // If setting as default, remove default status from other addresses
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
          NOT: { id: addressId },
        },
        data: { isDefault: false },
      });
    }

    // Update the address
    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        ...addressData,
        ...(addressType && { addressType }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return address;
  }

  async setDefault(userId: string, addressId: string): Promise<Address> {
    // Check if address exists and belongs to user
    await this.findOne(userId, addressId);

    // Remove default status from all user's addresses
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set the selected address as default
    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return address;
  }

  async remove(userId: string, addressId: string): Promise<void> {
    // Check if address exists and belongs to user
    const address = await this.findOne(userId, addressId);

    // Check if address is used in any order
    const ordersUsingAddress = await this.prisma.order.count({
      where: { addressId },
    });

    if (ordersUsingAddress > 0) {
      throw new BadRequestException(
        'Cannot delete address that is associated with existing orders',
      );
    }

    // Delete the address
    await this.prisma.address.delete({
      where: { id: addressId },
    });

    // If deleted address was default, set another address as default
    if (address.isDefault) {
      const anotherAddress = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (anotherAddress) {
        await this.prisma.address.update({
          where: { id: anotherAddress.id },
          data: { isDefault: true },
        });
      }
    }
  }

  async getDefaultAddress(userId: string): Promise<Address | null> {
    const address = await this.prisma.address.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    return address;
  }

  async getAddressesByType(
    userId: string,
    addressType: AddressType,
  ): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: {
        userId,
        addressType,
      },
      orderBy: { isDefault: 'desc' },
    });
  }

  async validateAddressForOrder(
    userId: string,
    addressId: string,
  ): Promise<Address> {
    const address = await this.findOne(userId, addressId);

    // Additional validation logic can be added here
    // For example, check if address is complete, verify postal code format, etc.

    if (
      !address.addressLine1 ||
      !address.city ||
      !address.state ||
      !address.postalCode
    ) {
      throw new BadRequestException('Address is incomplete');
    }

    return address;
  }

  async getAddressStatistics(userId: string) {
    const [total, byType, defaultAddress] = await Promise.all([
      this.prisma.address.count({ where: { userId } }),
      this.prisma.address.groupBy({
        by: ['addressType'],
        where: { userId },
        _count: true,
      }),
      this.prisma.address.findFirst({
        where: { userId, isDefault: true },
      }),
    ]);

    return {
      total,
      byType: byType.reduce(
        (acc, curr) => {
          acc[curr.addressType] = curr._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      hasDefaultAddress: !!defaultAddress,
    };
  }

  async bulkDelete(
    userId: string,
    addressIds: string[],
  ): Promise<{ deletedCount: number }> {
    // Check if addresses belong to user
    const addresses = await this.prisma.address.findMany({
      where: {
        id: { in: addressIds },
        userId,
      },
    });

    if (addresses.length !== addressIds.length) {
      throw new BadRequestException(
        'Some addresses not found or do not belong to user',
      );
    }

    // Check if any address is used in orders
    const addressesInOrders = await this.prisma.order.findMany({
      where: {
        addressId: { in: addressIds },
      },
      select: { addressId: true },
    });

    const usedAddressIds = new Set(addressesInOrders.map((o) => o.addressId));

    if (usedAddressIds.size > 0) {
      throw new BadRequestException(
        `Cannot delete addresses that are associated with orders: ${Array.from(usedAddressIds).join(', ')}`,
      );
    }

    // Delete addresses
    const result = await this.prisma.address.deleteMany({
      where: {
        id: { in: addressIds },
        userId,
      },
    });

    return { deletedCount: result.count };
  }
}
