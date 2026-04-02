import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryTreeDto } from './dto/category-tree.dto';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { plainToClass } from 'class-transformer';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category slug already exists',
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.create(createCategoryDto);
    return plainToClass(CategoryResponseDto, category);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated categories',
  })
  async findAll(@Query() query: CategoryQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get('active')
  @Public()
  @ApiOperation({ summary: 'Get all active categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all active categories',
  })
  async findAllActive() {
    const categories = await this.categoryService.findAllActive();
    return categories.map((cat) => plainToClass(CategoryResponseDto, cat));
  }

  @Get('tree')
  @Public()
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns category tree',
    type: [CategoryTreeDto],
  })
  async getCategoryTree() {
    return this.categoryService.getCategoryTree();
  }

  @Get('statistics')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category statistics (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns category statistics',
  })
  async getStatistics() {
    return this.categoryService.getCategoryStatistics();
  }

  @Get('breadcrumb/:id')
  @Public()
  @ApiOperation({ summary: 'Get category breadcrumb' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns category breadcrumb',
  })
  async getBreadcrumb(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.getCategoryBreadcrumb(id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns category',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeProducts') includeProducts?: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.findOne(
      id,
      includeProducts === 'true',
    );
    return plainToClass(CategoryResponseDto, category);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns category',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoryService.findBySlug(slug);
    return plainToClass(CategoryResponseDto, category);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category slug already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.update(id, updateCategoryDto);
    return plainToClass(CategoryResponseDto, category);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle category active status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category status toggled successfully',
    type: CategoryResponseDto,
  })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.toggleActive(id);
    return plainToClass(CategoryResponseDto, category);
  }

  @Post('reorder')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder categories (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories reordered successfully',
  })
  async reorderCategories(
    @Body('orderData') orderData: { id: string; order: number }[],
  ): Promise<{ message: string }> {
    await this.categoryService.reorderCategories(orderData);
    return { message: 'Categories reordered successfully' };
  }

  @Post('bulk-status')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update category status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories status updated successfully',
  })
  async bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('isActive') isActive: boolean,
  ): Promise<{ updatedCount: number }> {
    const updatedCount = await this.categoryService.bulkUpdateStatus(
      ids,
      isActive,
    );
    return { updatedCount };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Category has children or products',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('force') force?: string,
  ): Promise<void> {
    await this.categoryService.remove(id, force === 'true');
  }
}
