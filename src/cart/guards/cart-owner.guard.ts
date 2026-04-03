import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CartOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const cartId = request.params.cartId || request.body.cartId;
    const sessionId = request.headers['x-session-id'];

    if (!cartId) {
      return true;
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new ForbiddenException('Cart not found');
    }

    // Check if user owns the cart or session matches
    if (user && cart.userId === user.id) {
      return true;
    }

    if (sessionId && cart.sessionId === sessionId) {
      return true;
    }

    throw new ForbiddenException('You do not have access to this cart');
  }
}
