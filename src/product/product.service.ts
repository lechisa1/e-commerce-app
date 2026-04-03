// src/modules/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateProductDto,
  ProductImageDto,
  ProductAttributeDto,
  ProductVariantDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateStockDto } from './dto/product-stock.dto';
import { Product } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const {
      name,
      slug,
      sku,
      categoryId,
      tags,
      images,
      attributes,
      variants,
      ...productData
    } = createProductDto;

    // Generate slug if not provided
    let productSlug = slug;
    if (!productSlug) {
      productSlug = this.generateSlug(name);
    }

    // Check if slug is unique
    await this.checkUniqueSlug(productSlug);

    // Check if SKU is unique
    await this.checkUniqueSku(sku);

    // Check if category exists
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
    }

    // Create product with relations
    const product = await this.prisma.$transaction(async (prisma) => {
      // Create main product
      const newProduct = await prisma.product.create({
        data: {
          name,
          slug: productSlug,
          sku,
          categoryId: categoryId || null,
          ...productData,
        },
      });

      // Add images
      if (images && images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: ProductImageDto, index: number) => ({
            productId: newProduct.id,
            url: img.url,
            alt: img.alt,
            isMain: img.isMain || index === 0,
            order: img.order || index,
          })),
        });
      }

      // Add attributes
      if (attributes && attributes.length > 0) {
        await prisma.productAttribute.createMany({
          data: attributes.map((attr: ProductAttributeDto) => ({
            productId: newProduct.id,
            name: attr.name,
            value: attr.value,
          })),
        });
      }

      // Add variants
      if (variants && variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map((variant: ProductVariantDto) => ({
            productId: newProduct.id,
            sku: variant.sku,
            price: variant.price,
            quantity: variant.quantity,
            attributes: variant.attributes || {},
          })),
        });
      }

      // Add tags
      if (tags && tags.length > 0) {
        const tagConnections = await Promise.all(
          tags.map(async (tagName: string) => {
            const tag = await prisma.tag.upsert({
              where: { name: tagName.toLowerCase() },
              update: {},
              create: {
                name: tagName.toLowerCase(),
                slug: this.generateSlug(tagName),
              },
            });
            return { productId: newProduct.id, tagId: tag.id };
          }),
        );

        await prisma.productTag.createMany({
          data: tagConnections,
        });
      }

      return newProduct;
    });

    return this.findOne(product.id);
  }

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      categorySlug,
      isActive,
      isFeatured,
      inStock,
      minPrice,
      maxPrice,
      minRating,
      tags,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (categorySlug) {
      const category = await this.prisma.category.findUnique({
        where: { slug: categorySlug },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (inStock !== undefined) {
      if (inStock) {
        where.quantity = { gt: 0 };
      } else {
        where.quantity = 0;
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (minRating !== undefined) {
      where.reviews = {
        some: {
          rating: { gte: minRating },
        },
      };
    }

    if (tags && tags.length > 0) {
      where.productTags = {
        some: {
          tag: {
            name: { in: tags },
          },
        },
      };
    }

    // Determine sort order
    let orderBy: any = {};
    switch (sortBy) {
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'price':
        orderBy = { price: sortOrder };
        break;
      case 'quantity':
        orderBy = { quantity: sortOrder };
        break;
      case 'reviews':
        orderBy = { reviews: { _count: sortOrder } };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
          variants: true,
          attributes: true,
          productTags: {
            include: {
              tag: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Process products with additional data
    const productsWithDetails = products.map((product) => ({
      ...product,
      tags: product.productTags.map((t) => t.tag.name),
      averageRating:
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
            product.reviews.length
          : 0,
      reviewCount: product._count.reviews,
      mainImage: product.images.find((img) => img.isMain) || product.images[0],
    }));

    return {
      data: productsWithDetails,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, includeDetails: boolean = true): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        variants: true,
        attributes: true,
        productTags: {
          include: {
            tag: true,
          },
        },
        reviews: includeDetails
          ? {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            }
          : undefined,
        _count: {
          select: {
            reviews: true,
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Calculate average rating
    const averageRating =
      product.reviews && product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
          product.reviews.length
        : 0;

    return {
      ...product,
      tags: product.productTags.map((t) => t.tag.name),
      averageRating,
      reviewCount: product._count.reviews,
      orderCount: product._count.orderItems,
    };
  }

  async findBySlug(slug: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        variants: true,
        attributes: true,
        productTags: {
          include: {
            tag: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    const averageRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
          product.reviews.length
        : 0;

    return {
      ...product,
      tags: product.productTags.map((t) => t.tag.name),
      averageRating,
    };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    // Check if product exists
    await this.findOne(id);

    const {
      slug,
      sku,
      categoryId,
      tags,
      images,
      attributes,
      variants,
      ...productData
    } = updateProductDto;

    // Check slug uniqueness if being updated
    if (slug) {
      await this.checkUniqueSlug(slug, id);
    }

    // Check SKU uniqueness if being updated
    if (sku) {
      await this.checkUniqueSku(sku, id);
    }

    // Update product with relations
    const product = await this.prisma.$transaction(async (prisma) => {
      // Update main product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...productData,
          ...(slug && { slug }),
          ...(sku && { sku }),
          ...(categoryId !== undefined && { categoryId: categoryId || null }),
        },
      });

      // Update images if provided
      if (images) {
        // Delete existing images
        await prisma.productImage.deleteMany({
          where: { productId: id },
        });

        // Add new images
        if (images.length > 0) {
          await prisma.productImage.createMany({
            data: images.map((img: ProductImageDto, index: number) => ({
              productId: id,
              url: img.url,
              alt: img.alt,
              isMain: img.isMain || index === 0,
              order: img.order || index,
            })),
          });
        }
      }

      // Update attributes if provided
      if (attributes) {
        await prisma.productAttribute.deleteMany({
          where: { productId: id },
        });

        if (attributes.length > 0) {
          await prisma.productAttribute.createMany({
            data: attributes.map((attr: ProductAttributeDto) => ({
              productId: id,
              name: attr.name,
              value: attr.value,
            })),
          });
        }
      }

      // Update variants if provided
      if (variants) {
        await prisma.productVariant.deleteMany({
          where: { productId: id },
        });

        if (variants.length > 0) {
          await prisma.productVariant.createMany({
            data: variants.map((variant: ProductVariantDto) => ({
              productId: id,
              sku: variant.sku,
              price: variant.price,
              quantity: variant.quantity,
              attributes: variant.attributes || {},
            })),
          });
        }
      }

      // Update tags if provided
      if (tags) {
        await prisma.productTag.deleteMany({
          where: { productId: id },
        });

        if (tags.length > 0) {
          const tagConnections = await Promise.all(
            tags.map(async (tagName: string) => {
              const tag = await prisma.tag.upsert({
                where: { name: tagName.toLowerCase() },
                update: {},
                create: {
                  name: tagName.toLowerCase(),
                  slug: this.generateSlug(tagName),
                },
              });
              return { productId: id, tagId: tag.id };
            }),
          );

          await prisma.productTag.createMany({
            data: tagConnections,
          });
        }
      }

      return updatedProduct;
    });

    return this.findOne(product.id);
  }

  async remove(id: string, softDelete: boolean = true): Promise<void> {
    // Check if product exists
    await this.findOne(id);

    if (softDelete) {
      // Soft delete - just deactivate
      await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete - check if product has orders
      const orderCount = await this.prisma.orderItem.count({
        where: { productId: id },
      });

      if (orderCount > 0) {
        throw new BadRequestException(
          `Cannot delete product with ${orderCount} orders. Use soft delete instead.`,
        );
      }

      // Hard delete
      await this.prisma.product.delete({
        where: { id },
      });
    }
  }

  async updateStock(updateStockDto: UpdateStockDto): Promise<void> {
    const { productId, variantId, quantity, note } = updateStockDto;

    // Check if product exists
    await this.findOne(productId);

    if (variantId) {
      // Update variant stock
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Variant not found');
      }

      const newQuantity = variant.quantity + quantity;
      if (newQuantity < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { quantity: newQuantity },
      });

      // Update main product quantity (sum of all variants)
      const variants = await this.prisma.productVariant.findMany({
        where: { productId },
      });
      const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);

      await this.prisma.product.update({
        where: { id: productId },
        data: { quantity: totalQuantity },
      });
    } else {
      // Update main product stock
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const newQuantity = product.quantity + quantity;
      if (newQuantity < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      await this.prisma.product.update({
        where: { id: productId },
        data: { quantity: newQuantity },
      });
    }

    // Log inventory change
    await this.prisma.inventoryLog.create({
      data: {
        productId,
        variantId,
        quantity,
        type: quantity > 0 ? 'RESTOCK' : 'SALE',
        reference: note || 'Stock adjustment',
        note,
      },
    });
  }

  async addReview(
    productId: string,
    userId: string,
    rating: number,
    title?: string,
    comment?: string,
  ) {
    // Check if product exists
    await this.findOne(productId);

    // Check if user has purchased this product
    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          paymentStatus: 'PAID',
        },
      },
    });

    // Create review
    const review = await this.prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        title,
        comment,
        isVerified: !!hasPurchased,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return review;
  }

  async getRelatedProducts(
    productId: string,
    limit: number = 4,
  ): Promise<any[]> {
    const product = await this.findOne(productId);

    // Find products in same category or with similar tags
    const relatedProducts = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        isActive: true,
        OR: [
          { categoryId: product.categoryId },
          {
            productTags: {
              some: {
                tagId: {
                  in: product.tags?.map((t: any) => t.id) || [],
                },
              },
            },
          },
        ],
      },
      include: {
        images: {
          where: { isMain: true },
          take: 1,
        },
        _count: {
          select: { reviews: true },
        },
      },
      take: limit,
    });

    return relatedProducts.map((p) => ({
      ...p,
      averageRating: 0, // Calculate if needed
    }));
  }

  async getProductStatistics() {
    const [
      total,
      active,
      inactive,
      outOfStock,
      lowStock,
      featured,
      digital,
      totalValue,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: false } }),
      this.prisma.product.count({ where: { quantity: 0 } }),
      this.prisma.product.count({ where: { quantity: { gt: 0, lt: 10 } } }),
      this.prisma.product.count({ where: { isFeatured: true } }),
      this.prisma.product.count({ where: { isDigital: true } }),
      this.prisma.product.aggregate({
        _sum: { price: true },
        where: { isActive: true },
      }),
    ]);

    const topSelling = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const topProducts = await Promise.all(
      topSelling.map(async (item) => {
        const product = await this.findOne(item.productId);
        return {
          ...product,
          totalSold: item._sum.quantity,
        };
      }),
    );

    return {
      total,
      active,
      inactive,
      outOfStock,
      lowStock,
      featured,
      digital,
      totalInventoryValue: totalValue._sum.price || 0,
      topSellingProducts: topProducts,
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
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        slug,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with slug ${slug} already exists`);
    }
  }

  private async checkUniqueSku(sku: string, excludeId?: string): Promise<void> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        sku,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with SKU ${sku} already exists`);
    }
  }
}
