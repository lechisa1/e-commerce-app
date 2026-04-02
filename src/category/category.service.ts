import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { Category } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, slug, parentId, ...otherData } = createCategoryDto;

    // Generate slug if not provided
    let categorySlug = slug;
    if (!categorySlug) {
      categorySlug = this.generateSlug(name);
    }

    // Check if slug is unique
    await this.checkUniqueSlug(categorySlug);

    // If parentId is provided, check if parent exists
    if (parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID ${parentId} not found`,
        );
      }

      // Prevent circular reference
      if (parent.parentId === parentId) {
        throw new BadRequestException('Category cannot be its own parent');
      }
    }

    // Create category
    const category = await this.prisma.category.create({
      data: {
        name,
        slug: categorySlug,
        parentId,
        ...otherData,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return category;
  }

  async findAll(query: CategoryQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      includeInactive,
      parentId,
      sortBy = 'order',
      sortOrder = 'asc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Handle active status
    if (!includeInactive) {
      where.isActive = isActive !== undefined ? isActive : true;
    } else if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Filter by parent
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    // Get categories with pagination
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          children: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              slug: true,
              order: true,
              _count: {
                select: { products: true },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { products: true },
          },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    // Add level and full path to each category
    const categoriesWithMetadata = await Promise.all(
      categories.map(async (category) => ({
        ...category,
        level: await this.getCategoryLevel(category.id),
        fullPath: await this.getCategoryPath(category.id),
      })),
    );

    return {
      data: categoriesWithMetadata,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllActive(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              include: {
                children: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getCategoryTree(): Promise<any[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Build tree structure
    const buildTree = (
      parentId: string | null = null,
      level: number = 0,
    ): any[] => {
      return categories
        .filter((category) => category.parentId === parentId)
        .map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          order: category.order,
          level,
          productCount: category._count.products,
          children: buildTree(category.id, level + 1),
        }));
    };

    return buildTree(null);
  }

  async findOne(id: string, includeProducts: boolean = false): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: { products: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        products: includeProducts
          ? {
              where: { isActive: true },
              take: 10,
              include: {
                images: {
                  where: { isMain: true },
                  take: 1,
                },
              },
            }
          : undefined,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const level = await this.getCategoryLevel(category.id);
    const fullPath = await this.getCategoryPath(category.id);

    return {
      ...category,
      level,
      fullPath,
    };
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // Check if category exists
    await this.findOne(id);

    const { slug, parentId, ...otherData } = updateCategoryDto;

    // Check slug uniqueness if being updated
    if (slug) {
      await this.checkUniqueSlug(slug, id);
    }

    // If parentId is provided, validate parent
    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID ${parentId} not found`,
        );
      }

      // Check for circular reference
      const isCircular = await this.checkCircularReference(id, parentId);
      if (isCircular) {
        throw new BadRequestException(
          'Cannot create circular category reference',
        );
      }
    }

    // Update category
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...otherData,
        ...(slug && { slug }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return category;
  }

  async remove(id: string, force: boolean = false): Promise<void> {
    // Check if category exists
    const category = await this.findOne(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has children
    const childrenCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0 && !force) {
      throw new BadRequestException(
        `Category has ${childrenCount} child categories. Use force delete to delete all children.`,
      );
    }

    // Check if category has products
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Category has ${productCount} products. Remove or reassign products before deleting.`,
      );
    }

    if (force && childrenCount > 0) {
      // Delete all child categories recursively
      await this.deleteCategoryTree(id);
    } else {
      // Delete the category
      await this.prisma.category.delete({
        where: { id },
      });
    }
  }

  async toggleActive(id: string): Promise<Category> {
    const category = await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }

  async reorderCategories(
    orderData: { id: string; order: number }[],
  ): Promise<void> {
    const updates = orderData.map((item) =>
      this.prisma.category.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<number> {
    const result = await this.prisma.category.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    return result.count;
  }

  async getCategoryBreadcrumb(id: string): Promise<any[]> {
    const breadcrumb: { id: string; name: string; slug: string }[] = [];
    let currentCategory = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, parentId: true },
    });

    while (currentCategory) {
      breadcrumb.unshift({
        id: currentCategory.id,
        name: currentCategory.name,
        slug: currentCategory.slug,
      });

      if (currentCategory.parentId) {
        currentCategory = await this.prisma.category.findUnique({
          where: { id: currentCategory.parentId },
          select: { id: true, name: true, slug: true, parentId: true },
        });
      } else {
        break;
      }
    }

    return breadcrumb;
  }

  async getCategoryStatistics() {
    const [total, active, inactive, rootCategories, maxDepth] =
      await Promise.all([
        this.prisma.category.count(),
        this.prisma.category.count({ where: { isActive: true } }),
        this.prisma.category.count({ where: { isActive: false } }),
        this.prisma.category.count({ where: { parentId: null } }),
        this.getMaxCategoryDepth(),
      ]);

    const topCategories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        products: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return {
      total,
      active,
      inactive,
      rootCategories,
      maxDepth,
      topCategories: topCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        productCount: cat._count.products,
      })),
    };
  }

  // Helper Methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async checkUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        slug,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });

    if (existingCategory) {
      throw new ConflictException(`Category with slug ${slug} already exists`);
    }
  }

  private async getCategoryLevel(categoryId: string): Promise<number> {
    let level = 0;
    let currentCategory = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });

    while (currentCategory?.parentId) {
      level++;
      currentCategory = await this.prisma.category.findUnique({
        where: { id: currentCategory.parentId },
        select: { parentId: true },
      });
    }

    return level;
  }

  private async getCategoryPath(categoryId: string): Promise<string> {
    const breadcrumb = await this.getCategoryBreadcrumb(categoryId);
    return breadcrumb.map((c) => c.name).join(' > ');
  }

  private async checkCircularReference(
    categoryId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentParentId: string | null = newParentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      currentParentId = parent?.parentId || null;
    }

    return false;
  }

  private async deleteCategoryTree(categoryId: string): Promise<void> {
    const children = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    for (const child of children) {
      await this.deleteCategoryTree(child.id);
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });
  }

  private async getMaxCategoryDepth(): Promise<number> {
    const categories = await this.prisma.category.findMany();
    let maxDepth = 0;

    for (const category of categories) {
      const depth = await this.getCategoryLevel(category.id);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }

    return maxDepth;
  }
}
