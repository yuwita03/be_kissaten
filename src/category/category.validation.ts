import { z } from 'zod';

export class CategoryValidation {
  static readonly CREATE = z.object({
    name: z.string().min(1, 'Name is required'),
  });

  static readonly UPDATE = z.object({
    name: z.string().min(1).optional(),
  });
}

export type CreateCategoryRequest = z.infer<typeof CategoryValidation.CREATE>;
export type UpdateCategoryRequest = z.infer<typeof CategoryValidation.UPDATE>;
