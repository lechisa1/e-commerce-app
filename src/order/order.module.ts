// src/modules/order/order.module.ts
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';
import { ProductModule } from '../product/product.module';
import {
  OrderOwnerGuard,
  OrderStatusGuard,
  PaymentStatusGuard,
  OrderStockGuard,
  CheckoutValidationGuard,
} from './guards';

@Module({
  imports: [AuthModule, CartModule, ProductModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderOwnerGuard,
    OrderStatusGuard,
    PaymentStatusGuard,
    OrderStockGuard,
    CheckoutValidationGuard,
  ],
  exports: [OrderService],
})
export class OrderModule {}
