// src/modules/order/guards/checkout-validation.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CheckoutValidationGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { addressId, shippingAddress, items, paymentMethod } = request.body;

    // Validate items
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Validate address
    if (!addressId && !shippingAddress) {
      throw new BadRequestException('Shipping address is required');
    }

    // If addressId provided, validate it belongs to user
    if (addressId && request.user) {
      const address = await this.prisma.address.findFirst({
        where: {
          id: addressId,
          userId: request.user.id,
        },
      });

      if (!address) {
        throw new BadRequestException('Invalid shipping address');
      }
    }

    // Validate shipping address fields
    if (shippingAddress) {
      const requiredFields = [
        'addressLine1',
        'city',
        'state',
        'country',
        'postalCode',
      ];
      for (const field of requiredFields) {
        if (!shippingAddress[field]) {
          throw new BadRequestException(
            `Shipping address ${field} is required`,
          );
        }
      }
    }

    // Validate payment method
    const validPaymentMethods = ['COD', 'STRIPE', 'PAYPAL', 'BANK_TRANSFER'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      throw new BadRequestException(`Invalid payment method: ${paymentMethod}`);
    }

    return true;
  }
}
