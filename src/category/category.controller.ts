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

import { CategoryService } from './category.service';
import {
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from './category.validation';

import type {
  CategoryResponse,
  CategoryListResponse,
} from './category.validation';

import { AuthGuard } from '../common/auth/auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '../common/roles.enum';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create category (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  async create(
    @Body() request: CreateCategoryDTO,
  ): Promise<CategoryResponse> {
    return this.categoryService.create(request);
  }

  @Get()
  @ApiOperation({
    summary: 'List categories with pagination and optional search',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
  })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<CategoryListResponse> {
    return this.categoryService.findAll(
      Number(page),
      Number(limit),
      search,
    );
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update category (Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async update(
    @Param('id') id: string,
    @Body() request: UpdateCategoryDTO,
  ): Promise<CategoryResponse> {
    return this.categoryService.update(
      Number(id),
      request,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete category (Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
  })
  @ApiResponse({
    status: 204,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async delete(
    @Param('id') id: string,
  ): Promise<void> {
    return this.categoryService.delete(Number(id));
  }
}