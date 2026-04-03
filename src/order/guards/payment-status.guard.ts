import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentStatusGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orderId = request.params.id;
    const { paymentStatus } = request.body;

    if (!paymentStatus) {
      return true;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        total: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Validate payment status transitions
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.UNPAID]: [PaymentStatus.PAID, PaymentStatus.FAILED],
      [PaymentStatus.PAID]: [
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED,
      ],
      [PaymentStatus.PARTIALLY_PAID]: [
        PaymentStatus.PAID,
        PaymentStatus.FAILED,
      ],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [PaymentStatus.UNPAID],
    };

    const allowedTransitions = validTransitions[order.paymentStatus];
    if (!allowedTransitions.includes(paymentStatus)) {
      throw new BadRequestException(
        `Invalid payment status transition from ${order.paymentStatus} to ${paymentStatus}`,
      );
    }

    // Additional validation for refund
    if (paymentStatus === PaymentStatus.REFUNDED) {
      const payment = await this.prisma.payment.findFirst({
        where: { orderId, status: PaymentStatus.PAID },
      });

      if (!payment) {
        throw new BadRequestException('No paid payment found to refund');
      }
    }

    return true;
  }
}
