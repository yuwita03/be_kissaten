import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../common/prisma.service';
import { ValidationService } from '../common/validation.service';
import {
  ProductValidation,
  CreateProductRequest,
  UpdateProductRequest,
} from './product.validation';

export interface ProductResponse {
  id: number;
  name: string;
  price: number;
  image: string | null;
  categoryId: number;
  categoryName: string;
}

export interface ProductListResponse {
  data: ProductResponse[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async create(request: CreateProductRequest): Promise<ProductResponse> {
    this.logger.debug('Creating product', { name: request.name });

    const validated = this.validationService.validate(
      ProductValidation.CREATE,
      request,
    );

    const category = await this.prisma.category.findUnique({
      where: { id: validated.categoryId },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const product = await this.prisma.product.create({
      data: {
        name: validated.name,
        price: validated.price,
        image: validated.image ?? null,
        categoryId: validated.categoryId,
      },
      include: { category: true },
    });

    this.logger.info('Product created successfully', { productId: product.id });

    return this.toProductResponse(product);
  }

  async findAll(
    categoryId?: number,
    page = 1,
    limit = 10,
  ): Promise<ProductListResponse> {
    this.logger.debug('Fetching products', { categoryId, page, limit });

    const where = categoryId ? { categoryId } : {};
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => this.toProductResponse(p)),
      total,
      page,
      limit,
    };
  }

  async findById(id: number): Promise<ProductResponse> {
    this.logger.debug('Fetching product by ID', { id });

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.toProductResponse(product);
  }

  async update(
    id: number,
    request: UpdateProductRequest,
  ): Promise<ProductResponse> {
    this.logger.debug('Updating product', { id });

    const validated = this.validationService.validate(
      ProductValidation.UPDATE,
      request,
    );

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (validated.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: validated.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: validated.name ?? product.name,
        price: validated.price ?? product.price,
        image: validated.image !== undefined ? validated.image : product.image,
        categoryId: validated.categoryId ?? product.categoryId,
      },
      include: { category: true },
    });

    this.logger.info('Product updated successfully', { id });

    return this.toProductResponse(updated);
  }

  async delete(id: number): Promise<void> {
    this.logger.debug('Deleting product', { id });

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.delete({ where: { id } });

    this.logger.info('Product deleted successfully', { id });
  }

  private toProductResponse(product: {
    id: number;
    name: string;
    price: number;
    image: string | null;
    categoryId: number;
    category: { name: string };
  }): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      categoryId: product.categoryId,
      categoryName: product.category.name,
    };
  }
}
