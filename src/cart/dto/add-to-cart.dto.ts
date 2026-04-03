import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

export class AddToCartDto {
  @ApiProperty({ example: 'product-id-123' })
  @IsCuid()
  productId: string;

  @ApiPropertyOptional({ example: 'variant-id-456' })
  @IsOptional()
  @IsCuid()
  variantId?: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
