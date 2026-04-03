// src/modules/order/guards/order-status.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderStatusGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  private readonly validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
    [OrderStatus.FAILED]: [OrderStatus.CANCELLED],
  };

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orderId = request.params.id;
    const newStatus = request.body.status;
    const user = request.user;

    if (!newStatus) {
      return true; // No status update, allow
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, userId: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Check if status transition is valid
    const allowedTransitions = this.validTransitions[order.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${newStatus}`,
      );
    }

    // Additional validation for specific transitions
    if (newStatus === OrderStatus.CANCELLED) {
      // Check if order can be cancelled
      const cancellableStatuses: OrderStatus[] = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.CONFIRMED,
      ];

      if (!cancellableStatuses.includes(order.status)) {
        throw new BadRequestException(
          `Order cannot be cancelled in ${order.status} status`,
        );
      }
    }

    if (newStatus === OrderStatus.REFUNDED) {
      // Only admins can refund
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can process refunds');
      }

      // Check if order is delivered
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException('Only delivered orders can be refunded');
      }
    }

    return true;
  }
}
