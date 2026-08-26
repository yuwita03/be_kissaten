import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, PrismaService, ValidationService],
  exports: [ProductService],
})
export class ProductModule {}
