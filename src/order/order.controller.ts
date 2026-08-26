import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  OrderService,
  OrderResponse,
  OrderListResponse,
} from './order.service';
import type {
  CreateOrderRequest,
  MidtransNotificationRequest,
} from './order.validation';
import { AuthGuard } from '../common/auth/auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order (guest or authenticated)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or product not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (if token provided but invalid)',
  })
  async create(
    @Request() req: { user?: { sub: number; role: Role } },
    @Body() request: CreateOrderRequest,
  ): Promise<OrderResponse> {
    const user = req.user
      ? { id: req.user.sub, role: req.user.role }
      : undefined;
    return this.orderService.create(request, user);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order detail (owner or admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Order detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findById(
    @Request() req: { user: { sub: number; role: Role } },
    @Param('id') id: string,
  ): Promise<OrderResponse> {
    return this.orderService.findById(Number(id), {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all orders (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<OrderListResponse> {
    return this.orderService.findAll(Number(page), Number(limit));
  }

  @Post('webhook/midtrans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Midtrans payment notification webhook' })
  @ApiResponse({ status: 200, description: 'Notification processed' })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or notification',
  })
  async midtransWebhook(
    @Body() notification: MidtransNotificationRequest,
  ): Promise<{ message: string }> {
    await this.orderService.handleMidtransNotification(notification);
    return { message: 'OK' };
  }
}
