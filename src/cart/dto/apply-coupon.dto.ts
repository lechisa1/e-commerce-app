import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @MaxLength(50)
  code: string;
}
