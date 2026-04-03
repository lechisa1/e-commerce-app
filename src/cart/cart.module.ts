import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { ProductModule } from 'src/product/product.module';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  controllers: [CartController],
  providers: [CartService],
  imports: [ProductModule, AuthModule],
})
export class CartModule {}
