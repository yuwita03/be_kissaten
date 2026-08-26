import { z } from 'zod';
import { Role } from '../common/roles.enum';


export class UserValidation {
  static readonly REGISTER = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  static readonly LOGIN = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  static readonly UPDATE = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
  });
}

export type RegisterUserRequest = z.infer<typeof UserValidation.REGISTER>;
export type LoginUserRequest = z.infer<typeof UserValidation.LOGIN>;
export type UpdateUserRequest = z.infer<typeof UserValidation.UPDATE>;

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  user: UserResponse;
  accessToken: string;
}