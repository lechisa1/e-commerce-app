import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 'cart-item-id-789' })
  @IsCuid()
  itemId: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 999 })
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
