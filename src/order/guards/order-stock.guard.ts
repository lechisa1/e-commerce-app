// src/modules/order/guards/order-stock.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderStockGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const items = request.body.items;

    if (!items || items.length === 0) {
      return true;
    }

    // Validate stock for each item
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId, isActive: true },
      });

      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      let availableStock = product.quantity;

      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant || variant.productId !== item.productId) {
          throw new BadRequestException(`Variant ${item.variantId} not found`);
        }

        availableStock = variant.quantity;
      }

      if (item.quantity > availableStock) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Only ${availableStock} available.`,
        );
      }
    }

    return true;
  }
}
