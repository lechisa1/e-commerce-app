// src/modules/order/order.controller.ts (updated with guards)
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { CancelOrderDto } from './dto/order-cancel.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import {
  OrderOwnerGuard,
  OrderStatusGuard,
  PaymentStatusGuard,
  OrderStockGuard,
  CheckoutValidationGuard,
} from './guards';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(CheckoutValidationGuard, OrderStockGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderService.createOrder(userId, createOrderDto);
    return plainToClass(OrderResponseDto, order);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated orders',
  })
  async getOrders(
    @CurrentUser('id') userId: string,
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.getOrders(userId, query, false);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated orders',
  })
  async getAllOrders(@Query() query: OrderQueryDto) {
    return this.orderService.getOrders('', query, true);
  }

  @Get('statistics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order statistics' })
  async getStatistics(@CurrentUser('id') userId: string) {
    return this.orderService.getOrderStatistics(userId, false);
  }

  @Get('admin/statistics')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order statistics (Admin only)' })
  async getAdminStatistics() {
    return this.orderService.getOrderStatistics('', true);
  }

  @Get(':id')
  @UseGuards(OrderOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns order',
    type: OrderResponseDto,
  })
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<OrderResponseDto> {
    const order = await this.orderService.getOrderById(id, userId, false);
    return plainToClass(OrderResponseDto, order);
  }

  @Get('number/:orderNumber')
  @UseGuards(OrderOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by order number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns order',
    type: OrderResponseDto,
  })
  async getOrderByNumber(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    const order = await this.orderService.getOrderByNumber(
      orderNumber,
      userId,
      false,
    );
    return plainToClass(OrderResponseDto, order);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard, OrderStatusGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status updated',
    type: OrderResponseDto,
  })
  async updateOrderStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderService.updateOrderStatus(
      id,
      updateOrderStatusDto,
      userId,
      true,
    );
    return plainToClass(OrderResponseDto, order);
  }

  @Patch(':id/payment')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard, PaymentStatusGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status updated',
    type: OrderResponseDto,
  })
  async updatePaymentStatus(
    @Param('id', ParseCuidPipe) id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderService.updatePaymentStatus(
      id,
      updatePaymentStatusDto,
      true,
    );
    return plainToClass(OrderResponseDto, order);
  }

  @Post(':id/cancel')
  @UseGuards(OrderOwnerGuard, OrderStatusGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order cancelled',
    type: OrderResponseDto,
  })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderService.cancelOrder(
      id,
      userId,
      cancelOrderDto,
      false,
    );
    return plainToClass(OrderResponseDto, order);
  }

  @Post(':id/admin-cancel')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard, OrderStatusGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order cancelled',
    type: OrderResponseDto,
  })
  async adminCancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderService.cancelOrder(
      id,
      userId,
      cancelOrderDto,
      true,
    );
    return plainToClass(OrderResponseDto, order);
  }
}
