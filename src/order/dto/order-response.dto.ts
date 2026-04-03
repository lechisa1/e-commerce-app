import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderItemResponseDto {
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
  price: number;

  @ApiProperty()
  @Expose()
  total: number;
}

export class PaymentResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  amount: number;

  @ApiProperty()
  @Expose()
  method: string;

  @ApiProperty()
  @Expose()
  status: PaymentStatus;

  @ApiProperty()
  @Expose()
  transactionId?: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class ShipmentResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  carrier: string;

  @ApiProperty()
  @Expose()
  trackingNumber?: string;

  @ApiProperty()
  @Expose()
  trackingUrl?: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  shippedAt?: Date;

  @ApiProperty()
  @Expose()
  deliveredAt?: Date;
}

export class OrderResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  orderNumber: string;

  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  userEmail: string;

  @ApiProperty()
  @Expose()
  userName: string;

  @ApiProperty()
  @Expose()
  status: OrderStatus;

  @ApiProperty()
  @Expose()
  paymentStatus: PaymentStatus;

  @ApiProperty()
  @Expose()
  shippingAddress: any;

  @ApiProperty()
  @Expose()
  billingAddress?: any;

  @ApiProperty()
  @Expose()
  subtotal: number;

  @ApiProperty()
  @Expose()
  discountTotal: number;

  @ApiProperty()
  @Expose()
  shippingCost: number;

  @ApiProperty()
  @Expose()
  taxTotal: number;

  @ApiProperty()
  @Expose()
  total: number;

  @ApiProperty()
  @Expose()
  notes?: string;

  @ApiProperty()
  @Expose()
  couponCode?: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  @Expose()
  items: OrderItemResponseDto[];

  @ApiProperty({ type: [PaymentResponseDto] })
  @Expose()
  payments: PaymentResponseDto[];

  @ApiProperty({ type: [ShipmentResponseDto] })
  @Expose()
  shipments: ShipmentResponseDto[];

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.orderLogs || [])
  logs?: any[];

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => {
    if (obj.status === 'DELIVERED' && obj.shipments?.[0]?.deliveredAt) {
      return obj.shipments[0].deliveredAt;
    }
    return null;
  })
  deliveredAt?: Date;

  constructor(partial: Partial<OrderResponseDto>) {
    Object.assign(this, partial);
  }
}
