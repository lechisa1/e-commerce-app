import { IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

export class UpdateStockDto {
  @ApiProperty()
  @IsCuid()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsCuid()
  variantId?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(-999999)
  quantity: number;

  @ApiPropertyOptional({ example: 'Restocked from supplier' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkUpdateStockDto {
  @ApiProperty({ type: [UpdateStockDto] })
  updates: UpdateStockDto[];
}
