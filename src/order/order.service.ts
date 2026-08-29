import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';
import { ProductService } from '../product/product.service';
import {
  OrderValidation,
  CreateOrderRequest,
  MidtransNotificationRequest,
  OrderResponse,
  OrderListResponse,
  SnapTransactionResponse
} from './order.validation';
import { Role } from '../common/roles.enum';
import { Snap } from 'midtrans-client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';



@Injectable()
export class OrderService {
  private snap: Snap;

  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
    private readonly productService: ProductService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const serverKey = isProduction
      ? this.configService.get<string>('MIDTRANS_SERVER_KEY_PROD')
      : this.configService.get<string>('MIDTRANS_SERVER_KEY_SANDBOX');
    const clientKey = isProduction
      ? this.configService.get<string>('MIDTRANS_CLIENT_KEY_PROD')
      : this.configService.get<string>('MIDTRANS_CLIENT_KEY_SANDBOX');

    if (!serverKey || !clientKey) {
      throw new Error('Midtrans credentials not configured');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    this.snap = new Snap({
      isProduction,
      serverKey,
      clientKey,
    });
  }

  async create(
    request: CreateOrderRequest,
    user?: { id: number; role: Role },
  ): Promise<OrderResponse> {
    this.logger.debug('Creating order', {
      userId: user?.id,
      itemCount: request.items.length,
    });

    const validated = this.validationService.validate(
      OrderValidation.CREATE,
      request,
    );

    let userId = validated.userId;
    let customerName = validated.customerName;

    if (user) {
      userId = user.id;
      customerName = undefined;
    } else {
      if (!customerName) {
        throw new BadRequestException(
          'customerName is required for guest checkout',
        );
      }
      userId = undefined;
    }

    const productIds = validated.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItemsData = validated.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const subtotal = product.price * item.qty;
      totalAmount += subtotal;
      return {
        productId: item.productId,
        qty: item.qty,
      };
    });

const order = await this.prisma.order.create({
  data: {
    userId,
    customerName,
    totalAmount,
    items: {
      create: orderItemsData,
    },
  },
  include: { items: { include: { product: true } }, user: true },
});

    const midtransOrderId = `${order.id}-${Date.now()}`;

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const snapResponse = (await this.snap.createTransaction({
      transaction_details: {
        order_id: midtransOrderId, // digabung timestamp biar selalu unik walau ID balik ke awal pas reset
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: customerName || 'Guest',
      },
    })) as SnapTransactionResponse;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { snapToken: snapResponse.token },
    });

    this.logger.info('Order created successfully', {
      orderId: order.id,
      totalAmount,
    });

    return this.toOrderResponse({
      ...order,
      snapToken: snapResponse.token,
    });
  }

  async findById(
    id: number,
    user?: { id: number; role: Role },
  ): Promise<OrderResponse> {
    this.logger.debug('Fetching order by ID', { id, userId: user?.id });

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, user: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user && user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return this.toOrderResponse(order);
  }

  async findAll(page = 1, limit = 10): Promise<OrderListResponse> {
    this.logger.debug('Fetching all orders', { page, limit });

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        include: { items: { include: { product: true } }, user: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count(),
    ]);

    return {
      data: orders.map((o) => this.toOrderResponse(o)),
      total,
      page,
      limit,
    };
  }

  async handleMidtransNotification(
    notification: MidtransNotificationRequest,
  ): Promise<void> {
    this.logger.debug('Processing Midtrans notification', {
      orderId: notification.order_id,
    });

    const validated = this.validationService.validate(
      OrderValidation.MIDTRANS_NOTIFICATION,
      notification,
    );

    const expectedSignature = this.generateSignature(
      validated.order_id,
      validated.status_code || '',
      validated.gross_amount || '0',
      this.configService.get<string>('MIDTRANS_SERVER_KEY_SANDBOX') || '',
    );

    if (
      validated.signature_key &&
      validated.signature_key !== expectedSignature
    ) {
      this.logger.warn('Invalid Midtrans signature', {
        orderId: validated.order_id,
      });
      throw new BadRequestException('Invalid signature');
    }

    const orderId = Number(validated.order_id.split('-')[0]);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
    });
    if (!order) {
      this.logger.warn('Order not found for Midtrans notification', {
        orderId: validated.order_id,
      });
      return;
    }

    let paymentStatus = order.paymentStatus;

    switch (validated.transaction_status) {
      case 'capture':
        if (validated.fraud_status === 'accept') {
          paymentStatus = 'PAID';
        }
        break;
      case 'settlement':
        paymentStatus = 'PAID';
        break;
      case 'pending':
        paymentStatus = 'PENDING';
        break;
      case 'deny':
      case 'cancel':
      case 'expire':
        paymentStatus = 'FAILED';
        break;
      case 'failure':
        paymentStatus = 'FAILED';
        break;
    }

    if (paymentStatus !== order.paymentStatus) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: paymentStatus,
        },
      });
      this.logger.info('Payment status updated', {
        orderId: order.id,
        status: paymentStatus,
      });
    }
  }

  private generateSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    serverKey: string,
  ): string {
    const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    return crypto.createHash('sha512').update(input).digest('hex');
  }

  private toOrderResponse(order: {
    id: number;
    userId: number | null;
    customerName: string | null;
    totalAmount: number;
    snapToken: string | null;
    paymentStatus: string;
    createdAt: Date;
    user: { name: string } | null;
    items: Array<{
      id: number;
      productId: number;
      qty: number;
      product: { name: string; price: number };
    }>;
  }): OrderResponse {
    return {
      id: order.id,
      userId: order.userId,
      customerName: order.customerName || order.user?.name || null,
      totalAmount: order.totalAmount,
      snapToken: order.snapToken,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        qty: item.qty,
        price: item.product.price,
        subtotal: item.product.price * item.qty,
      })),
    };
  }

  async findMyOrders(userId: number, page = 1, limit = 10): Promise<OrderListResponse> {
  this.logger.debug('Fetching my orders', { userId, page, limit });

  const [orders, total] = await Promise.all([
    this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.order.count({ where: { userId } }),
  ]);

  return {
    data: orders.map((o) => this.toOrderResponse(o)),
    total,
    page,
    limit,
  };
  }
}