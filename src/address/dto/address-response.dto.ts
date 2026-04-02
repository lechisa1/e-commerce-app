import { Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AddressType } from '@prisma/client';

export class AddressResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  addressLine1: string;

  @ApiProperty()
  @Expose()
  addressLine2?: string;

  @ApiProperty()
  @Expose()
  city: string;

  @ApiProperty()
  @Expose()
  state: string;

  @ApiProperty()
  @Expose()
  country: string;

  @ApiProperty()
  @Expose()
  postalCode: string;

  @ApiProperty()
  @Expose()
  phone?: string;

  @ApiProperty({ enum: AddressType })
  @Expose()
  addressType: AddressType;

  @ApiProperty()
  @Expose()
  isDefault: boolean;

  @ApiProperty()
  @Expose()
  @Transform(
    ({ obj }) =>
      `${obj.addressLine1}, ${obj.city}, ${obj.state} ${obj.postalCode}, ${obj.country}`,
  )
  fullAddress: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<AddressResponseDto>) {
    Object.assign(this, partial);
  }
}
