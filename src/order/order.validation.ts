import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export class OrderValidation {
  static readonly CREATE = z.object({
    userId: z.number().int().positive().optional(),
    customerName: z.string().min(1).optional(),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          qty: z.number().int().positive(),
        }),
      )
      .min(1, 'At least one item is required'),
  });

  static readonly MIDTRANS_NOTIFICATION = z.object({
    transaction_status: z.string(),
    order_id: z.string(),
    fraud_status: z.string().optional(),
    signature_key: z.string().optional(),
    gross_amount: z.string().optional(),
  });
}

export class CreateOrderDTO extends createZodDto(OrderValidation.CREATE) {}
export class MidtransNotificationDTO extends createZodDto(OrderValidation.MIDTRANS_NOTIFICATION) {}

export type CreateOrderRequest = z.infer<typeof OrderValidation.CREATE>;
export type MidtransNotificationRequest = z.infer<
  typeof OrderValidation.MIDTRANS_NOTIFICATION
>;

export interface OrderItemResponse {
  id: number;
  productId: number;
  productName: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  userId: number | null;
  customerName: string | null;
  totalAmount: number;
  snapToken: string | null;
  paymentStatus: string;
  createdAt: Date;
  items: OrderItemResponse[];
}

export interface OrderListResponse {
  data: OrderResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}