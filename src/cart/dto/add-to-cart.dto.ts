import { IsUUID, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 'product-id-123' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ example: 'variant-id-456' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
