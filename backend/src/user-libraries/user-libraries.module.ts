import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLibrary } from './entities/user-library.entity.js';
import { User } from '../users/entities/user.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { UserLibrariesService } from './user-libraries.service.js';
import { UserLibrariesController } from './user-libraries.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserLibrary, User, GameEdition, Order])],
  controllers: [UserLibrariesController],
  providers: [UserLibrariesService],
  exports: [UserLibrariesService],
})
export class UserLibrariesModule {}
