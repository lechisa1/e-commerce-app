import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { CancelOrderDto } from './dto/order-cancel.dto';
import { OrderNumberHelper } from './helpers/order-number.helper';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const {
      addressId,
      shippingAddress,
      billingAddress,
      items,
      couponCode,
      notes,
      paymentMethod = 'COD',
      shippingCost = 0,
      tax = 0,
    } = createOrderDto;

    // Validate items and check stock
    await this.validateOrderItems(items);

    // Get or validate address
    let finalShippingAddress = shippingAddress;
    let finalBillingAddress = billingAddress;

    if (addressId) {
      const savedAddress = await this.prisma.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!savedAddress) {
        throw new NotFoundException('Address not found');
      }
      finalShippingAddress = {
        addressLine1: savedAddress.addressLine1,
        addressLine2: savedAddress.addressLine2 || undefined,
        city: savedAddress.city,
        state: savedAddress.state,
        country: savedAddress.country,
        postalCode: savedAddress.postalCode,
        phone: savedAddress.phone || undefined,
        fullName: undefined,
        email: undefined,
      };
      finalBillingAddress = finalBillingAddress || finalShippingAddress;
    }

    if (!finalShippingAddress) {
      throw new BadRequestException('Shipping address is required');
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    let discountTotal = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await this.validateCoupon(couponCode, userId, subtotal);
      if (coupon) {
        if (coupon.discountType === 'PERCENTAGE') {
          discountTotal = (subtotal * Number(coupon.discountValue)) / 100;
          if (
            coupon.maximumDiscount &&
            discountTotal > Number(coupon.maximumDiscount)
          ) {
            discountTotal = Number(coupon.maximumDiscount);
          }
        } else {
          discountTotal = Number(coupon.discountValue);
        }

        // Update coupon usage
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const total = subtotal - discountTotal + shippingCost + tax;

    // Generate order number
    const orderNumber = OrderNumberHelper.generate();

    // Create order with transaction
    const order = await this.prisma.$transaction(async (prisma) => {
      // Create order
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          userId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          shippingAddress: finalShippingAddress as any,
          billingAddress: finalBillingAddress || (finalShippingAddress as any),
          subtotal,
          discountTotal,
          shippingCost,
          taxTotal: tax,
          total,
          notes,
          couponCode: couponCode || null,
        },
      });

      // Create order items and update stock
      for (const item of items) {
        await prisma.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          },
        });

        // Update stock
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { quantity: { decrement: item.quantity } },
          });
        } else {
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        // Log inventory
        await prisma.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            quantity: -item.quantity,
            type: 'SALE',
            reference: newOrder.id,
            note: `Order #${orderNumber}`,
          },
        });
      }

      // Create payment record for COD
      if (paymentMethod === 'COD') {
        await prisma.payment.create({
          data: {
            orderId: newOrder.id,
            amount: total,
            method: 'CASH_ON_DELIVERY',
            status: PaymentStatus.UNPAID,
          },
        });
      }

      // Clear user's cart
      await prisma.cart.update({
        where: { userId },
        data: { items: { deleteMany: {} } },
      });

      // Create order log
      await prisma.orderLog.create({
        data: {
          orderId: newOrder.id,
          status: OrderStatus.PENDING,
          note: 'Order created',
          createdBy: userId,
        },
      });

      return newOrder;
    });

    // Send order confirmation email (implement this)
    // await this.sendOrderConfirmationEmail(order.id);

    return this.getOrderById(order.id, userId);
  }

  async getOrders(
    userId: string,
    query: OrderQueryDto,
    isAdmin: boolean = false,
  ) {
    const {
      page,
      limit,
      search,
      status,
      paymentStatus,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = query;
    const skip = ((page ?? 1) - 1) * (limit ?? 10);

    // Build where conditions
    const where: any = {};

    if (!isAdmin) {
      where.userId = userId;
    } else if (query.userId) {
      where.userId = query.userId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  slug: true,
                  images: {
                    where: { isMain: true },
                    take: 1,
                  },
                },
              },
              variant: true,
            },
          },
          payments: true,
          shipments: true,
          orderLogs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Format orders
    const formattedOrders = orders.map((order) =>
      this.formatOrderResponse(order),
    );

    return {
      data: formattedOrders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / (limit ?? 10)),
      },
    };
  }

  async getOrderById(
    orderId: string,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: {
                  where: { isMain: true },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
        payments: true,
        shipments: true,
        orderLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    return this.formatOrderResponse(order);
  }

  async getOrderByNumber(
    orderNumber: string,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: {
                  where: { isMain: true },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
        payments: true,
        shipments: true,
        orderLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    return this.formatOrderResponse(order);
  }

  async updateOrderStatus(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
    isAdmin: boolean = false,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions (only admin or seller can update status)
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update order status');
    }

    const { status, note } = updateOrderStatusDto;

    // Validate status transition
    this.validateStatusTransition(order.status, status);

    // Update order status
    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });

      // Create log entry
      await prisma.orderLog.create({
        data: {
          orderId,
          status,
          note:
            note || `Order status changed from ${order.status} to ${status}`,
          createdBy: userId,
        },
      });

      // If order is cancelled, restore stock
      if (
        status === OrderStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED
      ) {
        await this.restoreStock(orderId, prisma);
      }

      // If order is delivered, update payment status if COD
      if (
        status === OrderStatus.DELIVERED &&
        order.paymentStatus === PaymentStatus.UNPAID
      ) {
        await prisma.payment.updateMany({
          where: { orderId, method: 'CASH_ON_DELIVERY' },
          data: { status: PaymentStatus.PAID },
        });
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.PAID },
        });
      }

      return updated;
    });

    // Send status update email (implement this)
    // await this.sendOrderStatusEmail(orderId, status);

    return this.getOrderById(orderId, userId, isAdmin);
  }

  async updatePaymentStatus(
    orderId: string,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
    isAdmin: boolean = false,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update payment status');
    }

    const { paymentStatus, transactionId, note } = updatePaymentStatusDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update payment status
    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus },
      }),
      this.prisma.payment.updateMany({
        where: { orderId },
        data: {
          status: paymentStatus,
          ...(transactionId && { transactionId }),
        },
      }),
      this.prisma.orderLog.create({
        data: {
          orderId,
          status: order.status,
          note: note || `Payment status changed to ${paymentStatus}`,
          createdBy: 'system',
        },
      }),
    ]);

    return this.getOrderById(orderId);
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    cancelOrderDto: CancelOrderDto,
    isAdmin: boolean = false,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to cancel this order',
      );
    }

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

    const { reason } = cancelOrderDto;

    // Cancel order
    const cancelledOrder = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // Restore stock
      await this.restoreStock(orderId, prisma);

      // Create log entry
      await prisma.orderLog.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          note: reason || `Order cancelled by ${isAdmin ? 'admin' : 'user'}`,
          createdBy: userId,
        },
      });

      // Update payment status if needed
      if (order.paymentStatus === PaymentStatus.PAID) {
        await prisma.payment.updateMany({
          where: { orderId },
          data: { status: PaymentStatus.REFUNDED },
        });
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
      }

      return updated;
    });

    return this.getOrderById(orderId, userId, isAdmin);
  }

  async getOrderStatistics(userId?: string, isAdmin: boolean = false) {
    const where: any = {};
    if (!isAdmin && userId) {
      where.userId = userId;
    }

    const [
      totalOrders,
      totalRevenue,
      averageOrderValue,
      ordersByStatus,
      ordersByPaymentStatus,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where: { ...where, paymentStatus: PaymentStatus.PAID },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...where, paymentStatus: PaymentStatus.PAID },
        _avg: { total: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        where,
        _count: true,
      }),
      this.prisma.order.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      averageOrderValue: averageOrderValue._avg.total || 0,
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      ordersByPaymentStatus: ordersByPaymentStatus.map((p) => ({
        status: p.paymentStatus,
        count: p._count,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        createdAt: order.createdAt,
      })),
    };
  }

  // Helper Methods
  private async validateOrderItems(items: OrderItemDto[]) {
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId, isActive: true },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      let availableStock = product.quantity;

      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant || variant.productId !== item.productId) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }
        availableStock = variant.quantity;
      }

      if (item.quantity > availableStock) {
        throw new BadRequestException(
          `Only ${availableStock} items available for ${product.name}`,
        );
      }
    }
  }

  private async validateCoupon(
    couponCode: string,
    userId: string,
    subtotal: number,
  ) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: couponCode.toUpperCase(),
        isActive: true,
        startsAt: { lte: new Date() },
        expiresAt: { gte: new Date() },
      },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid or expired coupon');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (coupon.minimumOrder && subtotal < Number(coupon.minimumOrder)) {
      throw new BadRequestException(
        `Minimum order of $${coupon.minimumOrder} required for this coupon`,
      );
    }

    if (coupon.perUserLimit) {
      const userCouponUsage = await this.prisma.couponUser.findUnique({
        where: {
          couponId_userId: {
            couponId: coupon.id,
            userId,
          },
        },
      });

      if (userCouponUsage && userCouponUsage.usedCount >= coupon.perUserLimit) {
        throw new BadRequestException(
          'You have reached the usage limit for this coupon',
        );
      }
    }

    return coupon;
  }

  private async restoreStock(
    orderId: string,
    prisma: Prisma.TransactionClient,
  ) {
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId },
    });

    for (const item of orderItems) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { increment: item.quantity } },
        });
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await prisma.inventoryLog.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: 'RETURN',
          reference: orderId,
          note: 'Stock restored from cancelled order',
        },
      });
    }
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.FAILED]: [OrderStatus.CANCELLED],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private formatOrderResponse(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      userEmail: order.user?.email,
      userName: order.user
        ? `${order.user.firstName} ${order.user.lastName}`
        : null,
      status: order.status,
      paymentStatus: order.paymentStatus,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      shippingCost: Number(order.shippingCost),
      taxTotal: Number(order.taxTotal),
      total: Number(order.total),
      notes: order.notes,
      couponCode: order.couponCode,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        productImage: item.product.images?.[0]?.url || null,
        variantId: item.variantId,
        variantName: item.variant?.attributes
          ? Object.values(item.variant.attributes as any).join(' / ')
          : null,
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.total),
      })),
      payments: order.payments.map((payment: any) => ({
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
      })),
      shipments: order.shipments.map((shipment: any) => ({
        id: shipment.id,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        status: shipment.status,
        shippedAt: shipment.shippedAt,
        deliveredAt: shipment.deliveredAt,
      })),
      logs: order.orderLogs,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
