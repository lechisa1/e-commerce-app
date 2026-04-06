import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { MockPaymentGateway } from './mock/mock-payment-gateway';
import { CreatePaymentDto, PaymentMethodType } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private mockPaymentGateway: MockPaymentGateway,
  ) {}

  async createPaymentIntent(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ) {
    const { orderId, paymentMethod, cardDetails, savePaymentMethod } =
      createPaymentDto;

    // Get order details
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if order already has a successful payment
    const existingPayment = order.payments.find(
      (p) => p.status === PaymentStatus.PAID,
    );
    if (existingPayment) {
      throw new BadRequestException('Order already has a successful payment');
    }

    // For COD, no payment processing needed
    if (paymentMethod === PaymentMethodType.CASH_ON_DELIVERY) {
      const payment = await this.createCODOrder(orderId, Number(order.total));
      return {
        payment,
        redirectUrl: `/orders/${orderId}/confirmation`,
      };
    }

    // For card payments, process with mock gateway
    if (
      paymentMethod === PaymentMethodType.CREDIT_CARD ||
      paymentMethod === PaymentMethodType.DEBIT_CARD
    ) {
      if (!cardDetails) {
        throw new BadRequestException('Card details are required');
      }

      // Process payment with mock gateway
      const paymentResult = await this.mockPaymentGateway.processPayment({
        amount: Number(order.total),
        currency: 'USD',
        cardNumber: cardDetails.cardNumber,
        expiryDate: cardDetails.expiryDate,
        cvv: cardDetails.cvv,
        cardHolderName: cardDetails.cardHolderName,
      });

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          orderId,
          amount: order.total,
          method: paymentMethod,
          status:
            paymentResult.status === 'SUCCEEDED'
              ? PaymentStatus.PAID
              : PaymentStatus.FAILED,
          transactionId: paymentResult.transactionId,
          gateway: 'MOCK',
          metadata: paymentResult.metadata,
        },
      });

      // If payment successful, update order status
      if (paymentResult.status === 'SUCCEEDED') {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.PAID },
        });

        // Create order log
        await this.prisma.orderLog.create({
          data: {
            orderId,
            status: order.status,
            note: `Payment received via ${paymentMethod}. Transaction ID: ${paymentResult.transactionId}`,
            createdBy: userId,
          },
        });

        // Save payment method if requested
        if (savePaymentMethod && userId) {
          await this.savePaymentMethod(
            userId,
            cardDetails,
            paymentResult.metadata,
          );
        }
      }

      return {
        payment,
        requires3DS: paymentResult.metadata?.requires3DS || false,
        paymentIntent: paymentResult,
      };
    }

    // For PayPal and Bank Transfer
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: order.total,
        method: paymentMethod,
        status: PaymentStatus.UNPAID,
        gateway: paymentMethod,
        metadata: {
          redirectUrl: `/payments/${paymentMethod.toLowerCase()}/redirect`,
          instructions: this.getPaymentInstructions(paymentMethod),
        },
      },
    });

    return {
      payment,
      instructions: this.getPaymentInstructions(paymentMethod),
      redirectUrl: `/payments/${paymentMethod.toLowerCase()}/process/${payment.id}`,
    };
  }

  async confirmPayment(userId: string, confirmPaymentDto: ConfirmPaymentDto) {
    const { paymentId, otp } = confirmPaymentDto;

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        order: { userId },
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Payment already confirmed');
    }

    // Simulate 3D secure confirmation
    if (otp && otp !== '123456') {
      throw new BadRequestException('Invalid OTP');
    }

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        metadata: {
          ...(payment.metadata as any),
          confirmedAt: new Date().toISOString(),
          otpVerified: !!otp,
        },
      },
    });

    // Update order
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: PaymentStatus.PAID },
    });

    // Create order log
    await this.prisma.orderLog.create({
      data: {
        orderId: payment.orderId,
        status: payment.order.status,
        note: 'Payment confirmed successfully',
        createdBy: userId,
      },
    });

    return updatedPayment;
  }

  async processRefund(
    userId: string,
    refundPaymentDto: RefundPaymentDto,
    isAdmin: boolean = false,
  ) {
    const { paymentId, amount, reason } = refundPaymentDto;

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        ...(!isAdmin && { order: { userId } }),
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    const paymentAmount = Number(payment.amount);
    const refundAmount = amount ? Number(amount) : paymentAmount;

    if (refundAmount > paymentAmount) {
      throw new BadRequestException(
        'Refund amount cannot exceed payment amount',
      );
    }

    // Process refund with mock gateway
    const refundResult = await this.mockPaymentGateway.processRefund(
      payment.transactionId!,
      Number(refundAmount),
    );

    if (!refundResult.success) {
      throw new BadRequestException(refundResult.message);
    }

    // Create refund record
    const refund = await this.prisma.refund.create({
      data: {
        orderId: payment.orderId,
        paymentId,
        amount: refundAmount,
        reason: reason || 'Customer request',
        status: 'PROCESSED',
      },
    });

    // Update payment status
    const newPaymentStatus =
      refundAmount === paymentAmount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: newPaymentStatus },
    });

    // Update order payment status
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: newPaymentStatus },
    });

    // Create order log
    await this.prisma.orderLog.create({
      data: {
        orderId: payment.orderId,
        status: payment.order.status,
        note: `Refund of $${refundAmount} processed. Reason: ${reason || 'N/A'}`,
        createdBy: userId,
      },
    });

    return {
      refund,
      payment: await this.prisma.payment.findUnique({
        where: { id: paymentId },
      }),
    };
  }

  async getPaymentStatus(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        order: { userId },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Get real-time status from mock gateway
    if (payment.transactionId) {
      const status = await this.mockPaymentGateway.getPaymentStatus(
        payment.transactionId,
      );
      return {
        ...payment,
        gatewayStatus: status,
      };
    }

    return payment;
  }

  async getOrderPayments(userId: string, orderId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        orderId,
        order: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }

  async getPaymentMethods(userId: string) {
    // Get saved payment methods for user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        savedPaymentMethods: true,
      },
    });

    return {
      availableMethods: [
        { type: 'CREDIT_CARD', name: 'Credit/Debit Card', icon: 'credit-card' },
        { type: 'PAYPAL', name: 'PayPal', icon: 'paypal' },
        { type: 'BANK_TRANSFER', name: 'Bank Transfer', icon: 'bank' },
        { type: 'CASH_ON_DELIVERY', name: 'Cash on Delivery', icon: 'cash' },
      ],
      savedMethods: user?.savedPaymentMethods || [],
    };
  }

  async simulateWebhook(eventType: string, payload: any) {
    // Simulate webhook for testing
    switch (eventType) {
      case 'payment.succeeded':
        const payment = await this.prisma.payment.findFirst({
          where: { transactionId: payload.transactionId },
        });
        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.PAID },
          });
        }
        break;

      case 'payment.failed':
        // Handle failed payment
        break;

      default:
        break;
    }

    return { received: true, eventType };
  }

  // Helper Methods
  private async createCODOrder(orderId: string, amount: number) {
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount,
        method: 'CASH_ON_DELIVERY',
        status: PaymentStatus.UNPAID,
        gateway: 'COD',
        metadata: {
          instructions: 'Pay cash upon delivery',
          expectedDelivery: '3-5 business days',
        },
      },
    });

    return payment;
  }

  private getPaymentInstructions(method: string): string {
    const instructions: Record<string, string> = {
      PAYPAL:
        'You will be redirected to PayPal to complete your payment securely.',
      BANK_TRANSFER:
        'Please transfer the amount to our bank account. Details will be sent to your email.',
    };
    return (
      instructions[method] ||
      'Please follow the instructions to complete your payment.'
    );
  }

  private async savePaymentMethod(
    userId: string,
    cardDetails: any,
    metadata: any,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const savedMethods = (user as any).savedPaymentMethods || [];

    const newMethod = {
      id: Date.now().toString(),
      type: 'CREDIT_CARD',
      last4: metadata.last4,
      cardType: metadata.cardType,
      expiryDate: cardDetails.expiryDate,
      cardHolderName: cardDetails.cardHolderName,
      isDefault: savedMethods.length === 0,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        savedPaymentMethods: [...savedMethods, newMethod],
      } as any,
    });
  }
}
