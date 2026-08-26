import { Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';
import {
  CategoryValidation,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './category.validation';

export interface CategoryResponse {
  id: number;
  name: string;
}

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async create(request: CreateCategoryRequest): Promise<CategoryResponse> {
    this.logger.debug('Creating category', { name: request.name });

    const validated = this.validationService.validate(
      CategoryValidation.CREATE,
      request,
    );

    const category = await this.prisma.category.create({
      data: { name: validated.name },
    });

    this.logger.info('Category created successfully', {
      categoryId: category.id,
    });

    return this.toCategoryResponse(category);
  }

  async findAll(): Promise<CategoryResponse[]> {
    this.logger.debug('Fetching all categories');

    const categories = await this.prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    return categories.map((c) => this.toCategoryResponse(c));
  }

  async update(
    id: number,
    request: UpdateCategoryRequest,
  ): Promise<CategoryResponse> {
    this.logger.debug('Updating category', { id });

    const validated = this.validationService.validate(
      CategoryValidation.UPDATE,
      request,
    );

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: { name: validated.name ?? category.name },
    });

    this.logger.info('Category updated successfully', { id });

    return this.toCategoryResponse(updated);
  }

  async delete(id: number): Promise<void> {
    this.logger.debug('Deleting category', { id });

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.category.delete({ where: { id } });

    this.logger.info('Category deleted successfully', { id });
  }

  private toCategoryResponse(category: {
    id: number;
    name: string;
  }): CategoryResponse {
    return { id: category.id, name: category.name };
  }
}
