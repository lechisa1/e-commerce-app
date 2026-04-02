import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto';

@Injectable()
export class CategoryValidationPipe implements PipeTransform {
  transform(value: CreateCategoryDto) {
    // Validate name doesn't contain special characters
    const nameRegex = /^[a-zA-Z0-9\s-]+$/;
    if (!nameRegex.test(value.name)) {
      throw new BadRequestException(
        'Category name can only contain letters, numbers, spaces, and hyphens',
      );
    }

    // Validate slug format if provided
    if (value.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(value.slug)) {
        throw new BadRequestException(
          'Slug can only contain lowercase letters, numbers, and hyphens',
        );
      }
    }

    return value;
  }
}
