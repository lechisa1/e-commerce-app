import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  orderId: string;

  @ApiProperty()
  @Expose()
  amount: number;

  @ApiProperty()
  @Expose()
  method: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  transactionId?: string;

  @ApiProperty()
  @Expose()
  gateway?: string;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => ({
    last4: obj.metadata?.last4,
    cardType: obj.metadata?.cardType,
    expiryDate: obj.metadata?.expiryDate,
  }))
  cardDetails?: any;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class PaymentIntentResponseDto {
  @ApiProperty()
  clientSecret: string;

  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;
}
