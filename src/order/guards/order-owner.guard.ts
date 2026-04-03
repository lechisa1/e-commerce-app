// src/modules/order/guards/order-owner.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orderId = request.params.id || request.params.orderId;
    const orderNumber = request.params.orderNumber;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    let order;

    if (orderId) {
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });
    } else if (orderNumber) {
      order = await this.prisma.order.findUnique({
        where: { orderNumber },
        select: { userId: true },
      });
    }

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user owns the order or is admin
    if (order.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to access this order',
      );
    }

    // Attach order to request for later use
    request.order = order;

    return true;
  }
}
