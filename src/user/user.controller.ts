import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService, UserResponse, LoginResponse } from './user.service';
import type {
  RegisterUserRequest,
  LoginUserRequest,
  UpdateUserRequest,
} from './user.validation';
import { AuthGuard } from '../common/auth/auth.guard';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() request: RegisterUserRequest): Promise<UserResponse> {
    return this.userService.register(request);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() request: LoginUserRequest): Promise<LoginResponse> {
    return this.userService.login(request);
  }

  @Get('current')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrent(
    @Request() req: { user: { sub: number } },
  ): Promise<UserResponse> {
    return this.userService.getCurrentUser(req.user.sub);
  }

  @Patch('current')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async updateCurrent(
    @Request() req: { user: { sub: number } },
    @Body() request: UpdateUserRequest,
  ): Promise<UserResponse> {
    return this.userService.updateUser(req.user.sub, request);
  }
}
