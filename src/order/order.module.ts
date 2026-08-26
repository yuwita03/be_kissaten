import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ProductModule } from '../product/product.module';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';

@Module({
  imports: [ProductModule],
  controllers: [OrderController],
  providers: [OrderService, PrismaService, ValidationService],
  exports: [OrderService],
})
export class OrderModule {}
