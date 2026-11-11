import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wishlist } from './entities/wishlist.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { WishlistsService } from './wishlists.service.js';
import { WishlistsController } from './wishlists.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Wishlist, User, Game])],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}
