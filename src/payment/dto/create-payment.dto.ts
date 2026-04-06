import { IsUUID, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
}

export class CreditCardDetailsDto {
  @ApiProperty({ example: '4242424242424242' })
  @IsString()
  cardNumber: string;

  @ApiProperty({ example: '12/25' })
  @IsString()
  expiryDate: string;

  @ApiProperty({ example: '123' })
  @IsString()
  cvv: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  cardHolderName: string;
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @ApiPropertyOptional({ type: CreditCardDetailsDto })
  @IsOptional()
  cardDetails?: CreditCardDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  savePaymentMethod?: boolean = false;
}
