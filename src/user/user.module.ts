// src/modules/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRoleGuard } from './guards/user-role.guard';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRoleGuard],
  exports: [UserService],
})
export class UserModule {}
