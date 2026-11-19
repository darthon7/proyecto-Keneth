import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { GamesModule } from '../games/games.module.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, User, UserLibrary]),
    GamesModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
