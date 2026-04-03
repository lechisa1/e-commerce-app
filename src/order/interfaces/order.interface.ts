import { OrderStatus, PaymentStatus } from '@prisma/client';

export interface IOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface IShippingAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone?: string;
  email?: string;
  fullName?: string;
}

export interface IPayment {
  id: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: Date;
}

export interface IShipment {
  id: string;
  carrier: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface IOrderLog {
  id: string;
  status: OrderStatus;
  note?: string;
  createdBy: string;
  createdAt: Date;
}

export interface IOrder {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: IShippingAddress;
  billingAddress?: IShippingAddress;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  taxTotal: number;
  total: number;
  notes?: string;
  couponCode?: string;
  items: IOrderItem[];
  payments: IPayment[];
  shipments: IShipment[];
  logs: IOrderLog[];
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
}

export interface IOrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  ordersByPaymentStatus: Array<{ status: PaymentStatus; count: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: OrderStatus;
    customerName: string;
    createdAt: Date;
  }>;
}

export interface IOrderStatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiresAdmin?: boolean;
  requiresPayment?: boolean;
  requiresStock?: boolean;
}

export interface IOrderEvent {
  orderId: string;
  orderNumber: string;
  event: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IOrderFilter {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  startDate?: Date;
  endDate?: Date;
  minTotal?: number;
  maxTotal?: number;
  search?: string;
  userId?: string;
}

export interface IOrderCreateResult {
  order: IOrder;
  paymentIntent?: any;
  redirectUrl?: string;
}

export interface IOrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
