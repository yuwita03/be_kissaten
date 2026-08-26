import { z } from 'zod';

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

export type CreateOrderRequest = z.infer<typeof OrderValidation.CREATE>;
export type MidtransNotificationRequest = z.infer<
  typeof OrderValidation.MIDTRANS_NOTIFICATION
>;
