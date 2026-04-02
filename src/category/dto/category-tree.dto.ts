import { ApiProperty } from '@nestjs/swagger';

export class CategoryTreeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  image?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  level: number;

  @ApiProperty()
  productCount: number;

  @ApiProperty({ type: [CategoryTreeDto] })
  children: CategoryTreeDto[];
}
