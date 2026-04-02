// src/modules/user/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
