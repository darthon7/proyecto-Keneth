import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review, User, Game, UserLibrary])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
