import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CategoryValidation {
  static readonly CREATE = z.object({
    name: z.string().min(1, 'Name is required'),
  });

  static readonly UPDATE = z.object({
    name: z.string().min(1).optional(),
  });
}

export class CreateCategoryDTO extends createZodDto(CategoryValidation.CREATE){}
export class UpdateCategoryDTO extends createZodDto(CategoryValidation.UPDATE){}

export type CreateCategoryRequest = z.infer<typeof CategoryValidation.CREATE>;
export type UpdateCategoryRequest = z.infer<typeof CategoryValidation.UPDATE>;

export interface CategoryResponse {
  id: number;
  name: string;
}