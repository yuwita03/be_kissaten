import { Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ValidationService {
  validate<T>(schema: ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
  }
}
