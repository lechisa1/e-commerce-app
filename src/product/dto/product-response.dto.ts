import { Expose, Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const toNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }

  const num = Number(value);
  return isNaN(num) ? null : num;
};
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
  @Transform(({ value }) => toNumber(value))
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
  @Transform(({ value }) => toNumber(value))
  price: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNumber(value))
  compareAtPrice?: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => toNumber(value))
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
  @Transform(({ value }) => toNumber(value))
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
