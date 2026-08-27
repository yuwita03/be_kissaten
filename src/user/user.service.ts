import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';
import { AuthService } from '../common/auth/auth.service';
import {
  UserValidation,
  RegisterUserRequest,
  LoginUserRequest,
  UpdateUserRequest,
  UserResponse,
  LoginResponse
} from './user.validation';
import { Role } from '../common/roles.enum';
import { User } from '../../generated/prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
    private readonly authService: AuthService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  

  async register(request: RegisterUserRequest): Promise<UserResponse> {
    this.logger.debug('Registering new user', { email: request.email });

    const validated = this.validationService.validate(
      UserValidation.REGISTER,
      request,
    );
    
    const existingUser = await this.prisma.user.findUnique({
      where: { email: validated.email },
    });
    
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await this.authService.hashPassword(
      validated.password,
    );

    const user = await this.prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: Role.USER,
      },
    });

    this.logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
    });

    return this.toUserResponse(user);
  }

  async login(request: LoginUserRequest): Promise<LoginResponse> {
    this.logger.debug('User login attempt', { email: request.email });

    const validated = this.validationService.validate(
      UserValidation.LOGIN,
      request,
    );

    const user = await this.authService.validateUser(
      validated.email,
      validated.password,
    );
    if (!user) {
      this.logger.warn('Login failed: invalid credentials', {
        email: validated.email,
      });
      throw new UnauthorizedException('Email or password is wrong');
    }

    const accessToken = await this.authService.generateToken(user);

    this.logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    return {
      user: this.toUserResponse(fullUser!),
      accessToken,
    };
  }

  async getCurrentUser(userId: number): Promise<UserResponse> {
    this.logger.debug('Getting current user', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async updateUser(
    userId: number,
    request: UpdateUserRequest,
  ): Promise<UserResponse> {
    this.logger.debug('Updating user', { userId });

    const validated = this.validationService.validate(
      UserValidation.UPDATE,
      request,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: Record<string, unknown> = {};
    if (validated.name !== undefined) data.name = validated.name;
    if (validated.email !== undefined) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: validated.email },
      });
      if (existingEmail && existingEmail.id !== userId) {
        throw new ConflictException('Email already registered');
      }
      data.email = validated.email;
    }
    if (validated.password !== undefined) {
      data.password = await this.authService.hashPassword(validated.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    this.logger.info('User updated successfully', { userId });

    return this.toUserResponse(updatedUser);
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
