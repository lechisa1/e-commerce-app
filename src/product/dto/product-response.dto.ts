import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  alt?: string;

  @ApiProperty()
  isMain: boolean;

  @ApiProperty()
  order: number;
}

export class ProductVariantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  attributes: any;
}

export class ProductAttributeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  value: string;
}

export class ProductResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  slug: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  shortDescription?: string;

  @ApiProperty()
  @Expose()
  sku: string;

  @ApiProperty()
  @Expose()
  price: number;

  @ApiProperty()
  @Expose()
  compareAtPrice?: number;

  @ApiProperty()
  @Expose()
  cost?: number;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  isFeatured: boolean;

  @ApiProperty()
  @Expose()
  isDigital: boolean;

  @ApiProperty()
  @Expose()
  weight?: number;

  @ApiProperty()
  @Expose()
  dimensions?: string;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) =>
    obj.category
      ? {
          id: obj.category.id,
          name: obj.category.name,
          slug: obj.category.slug,
        }
      : null,
  )
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({ type: [ProductImageResponseDto] })
  @Expose()
  images?: ProductImageResponseDto[];

  @ApiProperty({ type: [ProductVariantResponseDto] })
  @Expose()
  variants?: ProductVariantResponseDto[];

  @ApiProperty({ type: [ProductAttributeResponseDto] })
  @Expose()
  attributes?: ProductAttributeResponseDto[];

  @ApiProperty({ type: [String] })
  @Expose()
  tags?: string[];

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.reviews?.length || 0)
  reviewCount?: number;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.reviews || obj.reviews.length === 0) return 0;
    const sum = obj.reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / obj.reviews.length;
  })
  averageRating?: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ProductResponseDto>) {
    Object.assign(this, partial);
  }
}
