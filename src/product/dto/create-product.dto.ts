import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsUrl,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

const toNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
};

class DecimalTransformDecorator {
  static fromValidators(min: number, max: number) {
    return [
      Transform(({ value }) => toNumber(value)),
      IsNumber(),
      Min(min),
      Max(max),
    ];
  }
}

export class ProductImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 'Product image description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class ProductAttributeDto {
  @ApiProperty({ example: 'Color' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'Red' })
  @IsString()
  @MaxLength(100)
  value: string;
}

export class ProductVariantDto {
  @ApiProperty({ example: 'SKU-123-RED-M' })
  @IsString()
  @MaxLength(100)
  sku: string;

  @ApiProperty({ example: 29.99 })
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: { color: 'Red', size: 'M' } })
  @IsOptional()
  attributes?: Record<string, any>;
}

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'iphone-15-pro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ example: 'The latest iPhone with advanced features' })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ example: 'Latest smartphone from Apple' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiProperty({ example: 'IPH-15-PRO-001' })
  @IsString()
  @MaxLength(100)
  sku: string;

  @ApiProperty({ example: 999.99 })
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 1099.99 })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 800.0 })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDigital?: boolean;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 10.0 })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ example: 'Best smartphone 2024' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @ApiPropertyOptional({
    example: 'Discover the new iPhone with amazing features',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string;

  @ApiPropertyOptional({ example: 'category-id' })
  @IsOptional()
  @IsCuid()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String], example: ['tag1', 'tag2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @ArrayMaxSize(20)
  images?: ProductImageDto[];

  @ApiPropertyOptional({ type: [ProductAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}
