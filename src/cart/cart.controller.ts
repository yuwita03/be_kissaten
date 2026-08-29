import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDTO, UpdateCartItemDTO } from './cart.validation';
import type { CartResponse } from './cart.validation';
import { AuthGuard } from '../common/auth/auth.guard';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart detail' })
  async getCart(@Request() req: { user: { sub: number } }): Promise<CartResponse> {
    return this.cartService.getCart(req.user.sub);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addItem(
    @Request() req: { user: { sub: number } },
    @Body() body: AddCartItemDTO,
  ): Promise<CartResponse> {
    return this.cartService.addItem(req.user.sub, body);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(
    @Request() req: { user: { sub: number } },
    @Param('id') id: string,
    @Body() body: UpdateCartItemDTO,
  ): Promise<CartResponse> {
    return this.cartService.updateItem(req.user.sub, Number(id), body);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeItem(
    @Request() req: { user: { sub: number } },
    @Param('id') id: string,
  ): Promise<CartResponse> {
    return this.cartService.removeItem(req.user.sub, Number(id));
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@Request() req: { user: { sub: number } }): Promise<CartResponse> {
    return this.cartService.clearCart(req.user.sub);
  }
}