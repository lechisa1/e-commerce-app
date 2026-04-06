import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, PaymentMethodType } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import {
  PaymentResponseDto,
  PaymentIntentResponseDto,
} from './dto/payment-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { plainToClass } from 'class-transformer';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent for an order' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment intent created',
  })
  async createPaymentIntent(
    @CurrentUser('id') userId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.createPaymentIntent(userId, createPaymentDto);
  }

  @Post('confirm')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm payment (for 3D secure or pending payments)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment confirmed',
  })
  async confirmPayment(
    @CurrentUser('id') userId: string,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ) {
    return this.paymentService.confirmPayment(userId, confirmPaymentDto);
  }

  @Post('refund')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request refund for a payment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund processed',
  })
  async refundPayment(
    @CurrentUser('id') userId: string,
    @Body() refundPaymentDto: RefundPaymentDto,
  ) {
    return this.paymentService.processRefund(userId, refundPaymentDto, false);
  }

  @Post('admin/refund')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process refund (Admin only)' })
  async adminRefundPayment(
    @CurrentUser('id') userId: string,
    @Body() refundPaymentDto: RefundPaymentDto,
  ) {
    return this.paymentService.processRefund(userId, refundPaymentDto, true);
  }

  @Get('status/:paymentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns payment status',
  })
  async getPaymentStatus(
    @CurrentUser('id') userId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.paymentService.getPaymentStatus(userId, paymentId);
  }

  @Get('order/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns order payments',
  })
  async getOrderPayments(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentService.getOrderPayments(userId, orderId);
  }

  @Get('methods')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available payment methods' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns payment methods',
  })
  async getPaymentMethods(@CurrentUser('id') userId: string) {
    return this.paymentService.getPaymentMethods(userId);
  }

  @Post('webhook/simulate')
  @ApiOperation({ summary: 'Simulate payment webhook (for testing)' })
  @HttpCode(HttpStatus.OK)
  async simulateWebhook(
    @Body('eventType') eventType: string,
    @Body() payload: any,
  ) {
    return this.paymentService.simulateWebhook(eventType, payload);
  }

  // Mock endpoints for testing different scenarios
  @Post('test/success')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test successful payment' })
  async testSuccessPayment(
    @CurrentUser('id') userId: string,
    @Body('orderId') orderId: string,
  ) {
    const mockPaymentDto: CreatePaymentDto = {
      orderId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      cardDetails: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardHolderName: 'Test User',
      },
    };
    return this.paymentService.createPaymentIntent(userId, mockPaymentDto);
  }

  @Post('test/failed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test failed payment' })
  async testFailedPayment(
    @CurrentUser('id') userId: string,
    @Body('orderId') orderId: string,
  ) {
    const mockPaymentDto: CreatePaymentDto = {
      orderId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      cardDetails: {
        cardNumber: '4000000000000002',
        expiryDate: '12/25',
        cvv: '123',
        cardHolderName: 'Test User',
      },
    };
    return this.paymentService.createPaymentIntent(userId, mockPaymentDto);
  }

  @Post('test/3d-secure')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test 3D secure payment' })
  async test3DSecurePayment(
    @CurrentUser('id') userId: string,
    @Body('orderId') orderId: string,
  ) {
    const mockPaymentDto: CreatePaymentDto = {
      orderId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      cardDetails: {
        cardNumber: '4000000000000069',
        expiryDate: '12/25',
        cvv: '123',
        cardHolderName: 'Test User',
      },
    };
    return this.paymentService.createPaymentIntent(userId, mockPaymentDto);
  }
}
