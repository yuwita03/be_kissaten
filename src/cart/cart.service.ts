import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AddCartItemRequest, UpdateCartItemRequest, CartResponse } from './cart.validation';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart;
  }

  async getCart(userId: number): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
    });

    return this.toResponse(cart.id, items);
  }

  async addItem(userId: number, request: AddCartItemRequest): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: request.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: request.productId },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + request.qty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId: request.productId, qty: request.qty },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, request: UpdateCartItemRequest): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { qty: request.qty },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCart(userId);
  }

  private toResponse(
    cartId: number,
    items: Array<{
      id: number;
      productId: number;
      qty: number;
      product: { name: string; price: number; image: string | null };
    }>,
  ): CartResponse {
    const mappedItems = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      price: item.product.price,
      image: item.product.image,
      qty: item.qty,
      subtotal: item.product.price * item.qty,
    }));

    return {
      id: cartId,
      items: mappedItems,
      totalItems: mappedItems.reduce((sum, i) => sum + i.qty, 0),
      totalAmount: mappedItems.reduce((sum, i) => sum + i.subtotal, 0),
    };
  }
}