import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';

import {
  CategoryValidation,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryResponse,
  CategoryListResponse,
} from './category.validation';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(
    request: CreateCategoryRequest,
  ): Promise<CategoryResponse> {
    this.logger.debug('Creating category', {
      name: request.name,
    });

    const validated = this.validationService.validate(
      CategoryValidation.CREATE,
      request,
    );

    const category = await this.prisma.category.create({
      data: {
        name: validated.name,
      },
    });

    this.logger.info('Category created successfully', {
      categoryId: category.id,
    });

    return this.toCategoryResponse(category);
  }

async findAll(
  page = 1,
  limit = 10,
  search?: string,
): Promise<CategoryListResponse> {
  this.logger.debug('Fetching categories', {
    page,
    limit,
    search,
  });

  const where = search
    ? {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }
    : {};

  const [categories, total] = await Promise.all([
    this.prisma.category.findMany({
      where,
      orderBy: {
        id: 'asc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }),

    this.prisma.category.count({
      where,
    }),
  ]);

  return {
    data: categories.map((category) =>
      this.toCategoryResponse(category),
    ),
    total,
    page,
    limit,
  };
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

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: validated.name ?? category.name,
      },
    });

    this.logger.info('Category updated successfully', {
      id,
    });

    return this.toCategoryResponse(updated);
  }

  async delete(id: number): Promise<void> {
    this.logger.debug('Deleting category', { id });

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.category.delete({
      where: { id },
    });

    this.logger.info('Category deleted successfully', {
      id,
    });
  }

  private toCategoryResponse(category: {
    id: number;
    name: string;
  }): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
    };
  }
}