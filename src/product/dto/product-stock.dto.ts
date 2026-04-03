import { IsString, IsInt, Min, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
