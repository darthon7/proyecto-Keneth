import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { User } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { TokenService } from './token.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [
    TokenService,
    AuthService,
    AuthRateLimitGuard,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    TypeOrmModule,
    TokenService,
    AuthService,
    AuthRateLimitGuard,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}

