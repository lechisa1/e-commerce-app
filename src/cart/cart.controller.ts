import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private getSessionId(req: Request): string | null {
    return (
      (req.headers['x-session-id'] as string) || req.cookies?.sessionId || null
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns current cart',
    type: CartResponseDto,
  })
  async getCart(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ): Promise<CartResponseDto> {
    const sessionId = this.getSessionId(req);
    return this.cartService.getCart(userId, sessionId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item added to cart',
    type: CartResponseDto,
  })
  async addToCart(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    const sessionId = this.getSessionId(req);
    return this.cartService.addToCart(userId, sessionId, addToCartDto);
  }

  @Patch('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cart item updated',
    type: CartResponseDto,
  })
  async updateCartItem(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const sessionId = this.getSessionId(req);
    return this.cartService.updateCartItem(
      userId,
      sessionId,
      updateCartItemDto,
    );
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item removed from cart',
    type: CartResponseDto,
  })
  async removeCartItem(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<CartResponseDto> {
    const sessionId = this.getSessionId(req);
    return this.cartService.removeCartItem(userId, sessionId, itemId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cart cleared' })
  async clearCart(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const sessionId = this.getSessionId(req);
    await this.cartService.clearCart(userId, sessionId);
    return { message: 'Cart cleared successfully' };
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply coupon to cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon applied',
    type: CartResponseDto,
  })
  async applyCoupon(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
    @Body() applyCouponDto: ApplyCouponDto,
  ): Promise<CartResponseDto> {
    const sessionId = this.getSessionId(req);
    return this.cartService.applyCoupon(userId, sessionId, applyCouponDto);
  }

  @Delete('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove coupon from cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon removed',
    type: CartResponseDto,
  })
  async removeCoupon(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ): Promise<CartResponseDto> {
    const sessionId = this.getSessionId(req);
    return this.cartService.removeCoupon(userId, sessionId);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge guest cart with user cart (after login)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Carts merged successfully',
    type: CartResponseDto,
  })
  async mergeGuestCart(
    @CurrentUser('id') userId: string,
    @Body('sessionId') sessionId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.mergeGuestCart(userId, sessionId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get cart summary (totals only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns cart summary' })
  async getCartSummary(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ): Promise<any> {
    const sessionId = this.getSessionId(req);
    return this.cartService.getCartSummary(userId, sessionId);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate cart for checkout' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cart is valid for checkout',
  })
  async validateCart(
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      const sessionId = this.getSessionId(req);
      await this.cartService.validateCartForCheckout(userId, sessionId);
      return { valid: true };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }
}
