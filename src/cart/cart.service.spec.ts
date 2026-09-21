import { CartService } from './cart.service';
import { PrismaService } from '../common/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      cartItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    service = new CartService(prisma as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return cart with mapped items and totals', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 1,
          productId: 10,
          qty: 2,
          product: { name: 'Latte', price: 30000, image: null },
        },
        {
          id: 2,
          productId: 11,
          qty: 1,
          product: { name: 'Espresso', price: 20000, image: null },
        },
      ]);

      const result = await service.getCart(5);

      expect(result.totalItems).toBe(3); // 2 + 1
      expect(result.totalAmount).toBe(80000); // (30000*2) + (20000*1)
      expect(result.items).toHaveLength(2);
    });
  });

  describe('addItem', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      // Arrange: cart udah ada, tapi produk gak ketemu
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.product.findUnique.mockResolvedValue(null);
      // Act & Assert
      await expect(
        service.addItem(5, { productId: 999, qty: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a new cart item if product not already in cart', async () => {
      // Arrange
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.product.findUnique.mockResolvedValue({
        id: 1,
        name: 'Latte',
        price: 30000,
        image: null,
      });
      prisma.cartItem.findFirst.mockResolvedValue(null); // belum ada item ini
      prisma.cartItem.create.mockResolvedValue({
        id: 1,
        cartId: 1,
        productId: 1,
        qty: 2,
      });
      // getCart dipanggil lagi di akhir addItem, jadi perlu mock ini juga
      prisma.cartItem.findMany.mockResolvedValue([
        { id: 1, productId: 1, qty: 2, product: { name: 'Latte', price: 30000, image: null } },
      ]);
      // Act
      await service.addItem(5, { productId: 1, qty: 2 });
      // Assert: pastiin create dipanggil dengan data yang benar
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 1, productId: 1, qty: 2 },
      });
    });

    it('should increase qty if product already in cart', async () => {
      // Arrange: produk ini UDAH ada di cart dengan qty 1
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.product.findUnique.mockResolvedValue({
        id: 1,
        name: 'Latte',
        price: 30000,
        image: null,
      });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 10,
        cartId: 1,
        productId: 1,
        qty: 1,
      });
      prisma.cartItem.findMany.mockResolvedValue([]);
      // Act
      await service.addItem(5, { productId: 1, qty: 2 });
      // Assert: harusnya UPDATE (bukan create), qty jadi 1 + 2 = 3
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { qty: 3 },
      });
    });
  });

  describe('updateItem', () => {
    it('should throw NotFoundException if cart item does not exist', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 }); 
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem(5, 999, { qty: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update qty if cart item exists', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 10,
        cartId: 1,
        productId: 1,
        
        qty: 1,
      });
      prisma.cartItem.findMany.mockResolvedValue([]);
      await service.updateItem(5, 10, { qty: 5 });
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { qty: 5 },
      });
    });
  });

  describe('removeItem', () => {
    it('should throw NotFoundException if cart item does not exist', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem(5, 999)).rejects.toThrow(NotFoundException);
    });

    it('should delete cart item if it exists', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 10,
        cartId: 1,
        productId: 1,
        qty: 2,
      });
      prisma.cartItem.findMany.mockResolvedValue([]);

      await service.removeItem(5, 10);

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });
  });

  describe('clearCart', () => {
    it('should delete all items in the cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 1, userId: 5 });
      prisma.cartItem.findMany.mockResolvedValue([]);

      await service.clearCart(5);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 1 },
      });
    });
  });
});