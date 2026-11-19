import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { GamesModule } from '../games/games.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { RolesGuard } from '../common/auth/index.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), GamesModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService, RolesGuard],
})
export class UsersModule {}
