import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { Cart, CartItem, Coupon, DiscountType } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private readonly TAX_RATE = 0.1; // 10% tax
  private readonly SHIPPING_COST = 10.0; // Flat shipping

  async getOrCreateCart(
    userId: string | null,
    sessionId: string | null,
  ): Promise<any> {
    let cart: any;

    if (userId) {
      // Find or create cart for authenticated user
      cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    where: { isMain: true },
                    take: 1,
                  },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: {
                      where: { isMain: true },
                      take: 1,
                    },
                  },
                },
                variant: true,
              },
            },
          },
        });
      }
    } else if (sessionId) {
      // Find or create cart for guest user
      cart = await this.prisma.cart.findFirst({
        where: { sessionId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    where: { isMain: true },
                    take: 1,
                  },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { sessionId },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: {
                      where: { isMain: true },
                      take: 1,
                    },
                  },
                },
                variant: true,
              },
            },
          },
        });
      }
    } else {
      throw new BadRequestException(
        'Either userId or sessionId must be provided',
      );
    }

    return this.enrichCartData(cart);
  }

  async addToCart(
    userId: string | null,
    sessionId: string | null,
    addToCartDto: AddToCartDto,
  ): Promise<any> {
    const { productId, variantId, quantity } = addToCartDto;

    // Get product details
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check stock based on variant or main product
    let availableStock = product.quantity;
    let unitPrice = product.price;
    let variantData: any = null;

    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Variant not found');
      }

      availableStock = variant.quantity;
      unitPrice = variant.price;
      variantData = variant;
    }

    if (quantity > availableStock) {
      throw new BadRequestException(
        `Only ${availableStock} items available in stock`,
      );
    }

    // Get or create cart
    let cart = await this.getOrCreateCart(userId, sessionId);

    // Check if item already exists in cart
    const existingItem = cart.items.find(
      (item: any) =>
        item.productId === productId && item.variantId === variantId,
    );

    let cartItem: CartItem;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > availableStock) {
        throw new BadRequestException(
          `Cannot add ${quantity} more. Only ${availableStock - existingItem.quantity} available`,
        );
      }

      // Update existing item
      cartItem = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              images: {
                where: { isMain: true },
                take: 1,
              },
            },
          },
          variant: true,
        },
      });
    } else {
      // Create new cart item
      cartItem = await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          price: unitPrice,
        },
        include: {
          product: {
            include: {
              images: {
                where: { isMain: true },
                take: 1,
              },
            },
          },
          variant: true,
        },
      });
    }

    // Refresh cart data
    return this.getCart(userId, sessionId);
  }

  async updateCartItem(
    userId: string | null,
    sessionId: string | null,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<any> {
    const { itemId, quantity } = updateCartItemDto;

    // Get cart item
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
        variant: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify cart ownership
    await this.verifyCartOwnership(cartItem.cartId, userId, sessionId);

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      // Check stock availability
      let availableStock = cartItem.product.quantity;
      if (cartItem.variant) {
        availableStock = cartItem.variant.quantity;
      }

      if (quantity > availableStock) {
        throw new BadRequestException(
          `Only ${availableStock} items available in stock`,
        );
      }

      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    return this.getCart(userId, sessionId);
  }

  async removeCartItem(
    userId: string | null,
    sessionId: string | null,
    itemId: string,
  ): Promise<any> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify cart ownership
    await this.verifyCartOwnership(cartItem.cartId, userId, sessionId);

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId, sessionId);
  }

  async getCart(userId: string | null, sessionId: string | null): Promise<any> {
    const cart = await this.getOrCreateCart(userId, sessionId);
    return this.enrichCartData(cart);
  }

  async clearCart(
    userId: string | null,
    sessionId: string | null,
  ): Promise<void> {
    const cart = await this.getOrCreateCart(userId, sessionId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  async applyCoupon(
    userId: string | null,
    sessionId: string | null,
    applyCouponDto: ApplyCouponDto,
  ): Promise<any> {
    const { code } = applyCouponDto;
    const cart = await this.getOrCreateCart(userId, sessionId);

    // Find and validate coupon
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        startsAt: { lte: new Date() },
        expiresAt: { gte: new Date() },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid or expired coupon code');
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // Check minimum order
    if (coupon.minimumOrder && cart.subtotal < coupon.minimumOrder) {
      throw new BadRequestException(
        `Minimum order of $${coupon.minimumOrder} required for this coupon`,
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (cart.subtotal * Number(coupon.discountValue)) / 100;
      if (
        coupon.maximumDiscount &&
        discountAmount > Number(coupon.maximumDiscount)
      ) {
        discountAmount = Number(coupon.maximumDiscount);
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    // Update cart with coupon
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: coupon.code,
        couponDiscount: discountAmount,
      },
    });

    return this.getCart(userId, sessionId);
  }

  async removeCoupon(
    userId: string | null,
    sessionId: string | null,
  ): Promise<any> {
    const cart = await this.getOrCreateCart(userId, sessionId);

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: null,
        couponDiscount: null,
      },
    });

    return this.getCart(userId, sessionId);
  }

  async mergeGuestCart(userId: string, sessionId: string): Promise<any> {
    // Get guest cart
    const guestCart = await this.prisma.cart.findFirst({
      where: { sessionId },
      include: {
        items: true,
      },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getCart(userId, null);
    }

    // Get or create user cart
    let userCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!userCart) {
      userCart = await this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    // Merge items
    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items.find(
        (item) =>
          item.productId === guestItem.productId &&
          item.variantId === guestItem.variantId,
      );

      if (existingItem) {
        // Update existing item quantity
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + guestItem.quantity },
        });
      } else {
        // Move guest item to user cart
        await this.prisma.cartItem.update({
          where: { id: guestItem.id },
          data: { cartId: userCart.id },
        });
      }
    }

    // Delete guest cart
    await this.prisma.cart.delete({
      where: { id: guestCart.id },
    });

    // Apply any coupon from guest cart
    if (guestCart.couponCode && !userCart.couponCode) {
      await this.prisma.cart.update({
        where: { id: userCart.id },
        data: {
          couponCode: guestCart.couponCode,
          couponDiscount: guestCart.couponDiscount,
        },
      });
    }

    return this.getCart(userId, null);
  }

  async getCartSummary(
    userId: string | null,
    sessionId: string | null,
  ): Promise<any> {
    const cart = await this.getCart(userId, sessionId);

    return {
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      discount: cart.discount,
      shippingCost: cart.shippingCost,
      tax: cart.tax,
      total: cart.total,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
    };
  }

  async validateCartForCheckout(
    userId: string | null,
    sessionId: string | null,
  ): Promise<void> {
    const cart = await this.getCart(userId, sessionId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Check stock availability for all items
    for (const item of cart.items) {
      let availableStock = item.product.quantity;
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        availableStock = variant?.quantity || 0;
      }

      if (item.quantity > availableStock) {
        throw new BadRequestException(
          `${item.productName} only has ${availableStock} items available`,
        );
      }
    }
  }

  // Helper Methods
  private async enrichCartData(cart: any): Promise<any> {
    const items = cart.items.map((item: any) => {
      const unitPrice = item.variant?.price || item.product.price;
      const totalPrice = unitPrice * item.quantity;
      const productImage = item.product.images?.[0]?.url || null;
      const maxQuantity = item.variant?.quantity || item.product.quantity;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        productImage,
        variantId: item.variantId,
        variantName: item.variant?.attributes
          ? Object.values(item.variant.attributes as any).join(' / ')
          : null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        inStock: maxQuantity > 0,
        maxQuantity,
      };
    });

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0,
    );
    const discount = cart.couponDiscount || 0;
    const discountedSubtotal = subtotal - discount;
    const shippingCost = discountedSubtotal > 50 ? 0 : this.SHIPPING_COST; // Free shipping over $50
    const tax = discountedSubtotal * this.TAX_RATE;
    const total = discountedSubtotal + shippingCost + tax;

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items,
      itemCount: items.length,
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private async verifyCartOwnership(
    cartId: string,
    userId: string | null,
    sessionId: string | null,
  ): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (userId && cart.userId !== userId) {
      throw new BadRequestException(
        'You do not have permission to modify this cart',
      );
    }

    if (sessionId && cart.sessionId !== sessionId) {
      throw new BadRequestException('Invalid session');
    }
  }
}
