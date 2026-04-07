import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CouponResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: DiscountType })
  discountType: DiscountType;

  @ApiProperty()
  discountValue: number;

  @ApiPropertyOptional()
  minimumOrder: number | null;

  @ApiPropertyOptional()
  maximumDiscount: number | null;

  @ApiPropertyOptional()
  usageLimit: number | null;

  @ApiProperty()
  usedCount: number;

  @ApiPropertyOptional()
  perUserLimit: number | null;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [String] })
  categoryIds?: string[];
}
