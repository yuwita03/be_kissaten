import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  ProductService,
  ProductResponse,
  ProductListResponse,
} from './product.service';
import type {
  CreateProductRequest,
  UpdateProductRequest,
} from './product.validation';
import { AuthGuard } from '../common/auth/auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Category not found' })
  async create(
    @Body() request: CreateProductRequest,
  ): Promise<ProductResponse> {
    return this.productService.create(request);
  }

  @Get()
  @ApiOperation({
    summary: 'List products with optional category filter and pagination',
  })
  @ApiQuery({ name: 'categoryId', required: false, type: 'number' })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiResponse({ status: 200, description: 'List of products' })
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<ProductListResponse> {
    return this.productService.findAll(
      categoryId ? Number(categoryId) : undefined,
      Number(page),
      Number(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Product detail' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findById(@Param('id') id: string): Promise<ProductResponse> {
    return this.productService.findById(Number(id));
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Category not found' })
  async update(
    @Param('id') id: string,
    @Body() request: UpdateProductRequest,
  ): Promise<ProductResponse> {
    return this.productService.update(Number(id), request);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.productService.delete(Number(id));
  }
}
