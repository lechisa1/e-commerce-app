import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto } from './dto/coupon.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new coupon (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Coupon created successfully',
    type: CouponResponseDto,
  })
  async create(@Body() createCouponDto: CreateCouponDto): Promise<CouponResponseDto> {
    return this.couponService.create(createCouponDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coupons' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated coupons',
  })
  async findAll(@Query() query: CouponQueryDto) {
    return this.couponService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupon statistics (Admin only)' })
  async getStatistics() {
    return this.couponService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns coupon',
    type: CouponResponseDto,
  })
  async findOne(
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<CouponResponseDto> {
    return this.couponService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get coupon by code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns coupon',
    type: CouponResponseDto,
  })
  async findByCode(@Param('code') code: string): Promise<CouponResponseDto> {
    return this.couponService.findByCode(code);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coupon (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon updated successfully',
    type: CouponResponseDto,
  })
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.couponService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete coupon (Admin only)' })
  async remove(@Param('id', ParseCuidPipe) id: string): Promise<void> {
    await this.couponService.remove(id);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle coupon active status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon status toggled',
    type: CouponResponseDto,
  })
  async toggleActive(
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<CouponResponseDto> {
    return this.couponService.toggleActive(id);
  }
}
