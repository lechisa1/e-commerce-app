// src/modules/category/dto/category-response.dto.ts
import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
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
  description?: string;

  @ApiProperty()
  @Expose()
  image?: string;

  @ApiProperty()
  @Expose()
  parentId?: string;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  order: number;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) =>
    obj.parent
      ? {
          id: obj.parent.id,
          name: obj.parent.name,
          slug: obj.parent.slug,
        }
      : null,
  )
  parent?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty()
  @Expose()
  @Transform(
    ({ obj }) =>
      obj.children?.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        order: child.order,
      })) || [],
  )
  children?: Array<{
    id: string;
    name: string;
    slug: string;
    order: number;
  }>;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj._count?.products || 0)
  productCount?: number;

  @ApiProperty()
  @Expose()
  level?: number;

  @ApiProperty()
  @Expose()
  fullPath?: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<CategoryResponseDto>) {
    Object.assign(this, partial);
  }
}
