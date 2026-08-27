import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class ProductValidation {
  static readonly CREATE = z.object({
    name: z.string().min(1, 'Name is required'),
    price: z.number().int().positive('Price must be a positive integer'),
    image: z.string().url('Invalid image URL').optional().nullable(),
    categoryId: z.number().int().positive('Category ID is required'),
  });

  static readonly UPDATE = z.object({
    name: z.string().min(1).optional(),
    price: z.number().int().positive().optional(),
    image: z.string().url('Invalid image URL').optional().nullable(),
    categoryId: z.number().int().positive().optional(),
  });
}
export class CreateProductDTO extends createZodDto(ProductValidation.CREATE){}
export class UpdateProductDTO extends createZodDto(ProductValidation.UPDATE){}

export type CreateProductRequest = z.infer<typeof ProductValidation.CREATE>;
export type UpdateProductRequest = z.infer<typeof ProductValidation.UPDATE>;

export interface ProductResponse {
  id: number;
  name: string;
  price: number;
  image: string | null;
  categoryId: number;
  categoryName: string;
}

export interface ProductListResponse {
  data: ProductResponse[];
  total: number;
  page: number;
  limit: number;
}