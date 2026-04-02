// src/modules/address/address.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressQueryDto } from './dto/address-query.dto';
import { AddressResponseDto } from './dto/address-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { plainToClass } from 'class-transformer';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Address created successfully',
    type: AddressResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    const address = await this.addressService.create(userId, createAddressDto);
    return plainToClass(AddressResponseDto, address);
  }

  @Get()
  @ApiOperation({ summary: 'Get all addresses for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated addresses',
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: AddressQueryDto,
  ) {
    return this.addressService.findAll(userId, query);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default address for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns default address',
    type: AddressResponseDto,
  })
  async getDefaultAddress(@CurrentUser('id') userId: string) {
    const address = await this.addressService.getDefaultAddress(userId);
    return address ? plainToClass(AddressResponseDto, address) : null;
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get address statistics for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns address statistics',
  })
  async getStatistics(@CurrentUser('id') userId: string) {
    return this.addressService.getAddressStatistics(userId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get addresses by type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns addresses filtered by type',
  })
  async getAddressesByType(
    @CurrentUser('id') userId: string,
    @Param('type') type: string,
  ) {
    const addresses = await this.addressService.getAddressesByType(
      userId,
      type as any,
    );
    return addresses.map((address) =>
      plainToClass(AddressResponseDto, address),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns address',
    type: AddressResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Address not found',
  })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressResponseDto> {
    const address = await this.addressService.findOne(userId, id);
    return plainToClass(AddressResponseDto, address);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address updated successfully',
    type: AddressResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Address not found',
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const address = await this.addressService.update(
      userId,
      id,
      updateAddressDto,
    );
    return plainToClass(AddressResponseDto, address);
  }

  @Patch(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default address updated successfully',
    type: AddressResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Address not found',
  })
  async setDefault(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressResponseDto> {
    const address = await this.addressService.setDefault(userId, id);
    return plainToClass(AddressResponseDto, address);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete address' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Address deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Address not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Address is associated with orders',
  })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.addressService.remove(userId, id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bulk delete addresses (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Addresses deleted successfully',
  })
  async bulkDelete(
    @Body('addressIds') addressIds: string[],
  ): Promise<{ deletedCount: number }> {
    // Admin can delete any addresses, so we don't need userId
    // You might want to add additional logic here
    return this.addressService.bulkDelete(addressIds[0], addressIds); // This needs adjustment
  }
}
