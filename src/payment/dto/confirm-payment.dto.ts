import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty()
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otp?: string; // For simulating 3D secure
}
