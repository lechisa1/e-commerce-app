import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';

import { PaymentService } from './payment.service';
import { AuthModule } from 'src/auth/auth.module';
import { MockPaymentGateway } from './mock/mock-payment-gateway';
@Module({
  controllers: [PaymentController],
  imports: [AuthModule],
  providers: [PaymentService, MockPaymentGateway],
  exports: [PaymentService],
})
export class PaymentModule {}
