import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  productId: string;

  @ApiProperty()
  @Expose()
  productName: string;

  @ApiProperty()
  @Expose()
  productSlug: string;

  @ApiProperty()
  @Expose()
  productImage?: string;

  @ApiProperty()
  @Expose()
  variantId?: string;

  @ApiProperty()
  @Expose()
  variantName?: string;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty()
  @Expose()
  unitPrice: number;

  @ApiProperty()
  @Expose()
  totalPrice: number;

  @ApiProperty()
  @Expose()
  inStock: boolean;

  @ApiProperty()
  @Expose()
  maxQuantity: number;
}

export class CartResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  userId?: string;

  @ApiProperty()
  @Expose()
  sessionId?: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  @Expose()
  items: CartItemResponseDto[];

  @ApiProperty()
  @Expose()
  itemCount: number;

  @ApiProperty()
  @Expose()
  subtotal: number;

  @ApiProperty()
  @Expose()
  discount: number;

  @ApiProperty()
  @Expose()
  shippingCost: number;

  @ApiProperty()
  @Expose()
  tax: number;

  @ApiProperty()
  @Expose()
  total: number;

  @ApiProperty()
  @Expose()
  couponCode?: string;

  @ApiProperty()
  @Expose()
  couponDiscount?: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
