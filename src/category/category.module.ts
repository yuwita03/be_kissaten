import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, PrismaService, ValidationService],
  exports: [CategoryService],
})
export class CategoryModule {}
