import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { Role, PaymentStatus } from '../../generated/prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ResetService {
  constructor(private readonly prisma: PrismaService) {}

  // jalan otomatis tiap 3 jam, reset semua data balik ke kondisi seed awal
  @Cron(CronExpression.EVERY_3_HOURS)
  async resetDatabase() {
    console.log('🔄 Auto-reset: clearing database...');

    await this.prisma.orderItem.deleteMany();
    await this.prisma.order.deleteMany();
    await this.prisma.product.deleteMany();
    await this.prisma.category.deleteMany();
    await this.prisma.user.deleteMany();

    const adminPassword = await bcrypt.hash('adminpassword123', 10);
    const userPassword = await bcrypt.hash('userpassword123', 10);

    const admin = await this.prisma.user.create({
      data: { name: 'Admin Kissaten', email: 'admin@kissaten.jp', password: adminPassword, role: Role.ADMIN },
    });

    const user = await this.prisma.user.create({
      data: { name: 'Kenji Sato', email: 'user@kissaten.jp', password: userPassword, role: Role.USER },
    });

    const catEspresso = await this.prisma.category.create({ data: { name: 'Espresso Based' } });
    const catManualBrew = await this.prisma.category.create({ data: { name: 'Manual Brew' } });
    const catColdBrew = await this.prisma.category.create({ data: { name: 'Cold Brew' } });
    const catSpecialty = await this.prisma.category.create({ data: { name: 'Specialty Latte' } });

    await this.prisma.product.createMany({
      data: [
        { name: 'Single Espresso Shot', price: 20000, image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
        { name: 'Double Espresso (Doppio)', price: 25000, image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
        { name: 'Caffè Americano', price: 25000, image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
        { name: 'Classic Caffè Latte', price: 30000, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
        { name: 'Cappuccino', price: 30000, image: 'https://images.unsplash.com/photo-1572442388796-11668ba67e53?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
        { name: 'Flat White', price: 32000, image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
        { name: 'Piccolo Latte', price: 28000, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
        { name: 'Caffè Mocha', price: 35000, image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=600&q=80', categoryId: catEspresso.id },
      ],
    });

    await this.prisma.product.createMany({
      data: [
        { name: 'V60 Pour Over (Aceh Gayo)', price: 32000, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', categoryId: catManualBrew.id },
        { name: 'V60 Pour Over (Toraja Sapan)', price: 34000, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', categoryId: catManualBrew.id },
        { name: 'Japanese Ice Drip', price: 35000, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80', categoryId: catManualBrew.id },
        { name: 'Aeropress Special Brew', price: 33000, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', categoryId: catManualBrew.id },
      ],
    });

    await this.prisma.product.createMany({
      data: [
        { name: 'Classic Black Cold Brew', price: 30000, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', categoryId: catColdBrew.id },
        { name: 'White Cold Brew (Sweet Cream)', price: 34000, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80', categoryId: catColdBrew.id },
      ],
    });

    await this.prisma.product.createMany({
      data: [
        { name: 'Matcha Espresso Fusion', price: 38000, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80', categoryId: catSpecialty.id },
        { name: 'Tokyo Caramel Sea Salt Latte', price: 36000, image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80', categoryId: catSpecialty.id },
        { name: 'Kyoto Hojicha Latte (Coffee Shot)', price: 37000, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', categoryId: catSpecialty.id },
      ],
    });

    const sampleProduct = await this.prisma.product.findFirst();
    if (sampleProduct) {
      await this.prisma.order.create({
        data: {
          userId: user.id,
          customerName: user.name,
          totalAmount: sampleProduct.price * 2,
          paymentStatus: PaymentStatus.PAID,
          items: { create: [{ productId: sampleProduct.id, qty: 2 }] },
        },
      });
    }

    console.log('✅ Auto-reset done!');
  }
}