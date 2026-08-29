import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CartValidation {
  static readonly ADD_ITEM = z.object({
    productId: z.number().int().positive('Product ID is required'),
    qty: z.number().int().min(1).default(1),
  });

  static readonly UPDATE_ITEM = z.object({
    qty: z.number().int().min(1, 'Qty must be at least 1'),
  });
}

export class AddCartItemDTO extends createZodDto(CartValidation.ADD_ITEM) {}
export class UpdateCartItemDTO extends createZodDto(CartValidation.UPDATE_ITEM) {}

export type AddCartItemRequest = z.infer<typeof CartValidation.ADD_ITEM>;
export type UpdateCartItemRequest = z.infer<typeof CartValidation.UPDATE_ITEM>;

export interface CartItemResponse {
  id: number;
  productId: number;
  productName: string;
  price: number;
  image: string | null;
  qty: number;
  subtotal: number;
}

export interface CartResponse {
  id: number;
  items: CartItemResponse[];
  totalItems: number;
  totalAmount: number;
}