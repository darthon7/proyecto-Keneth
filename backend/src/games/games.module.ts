import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity.js';
import { Publisher } from '../publishers/entities/publisher.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { Genre } from '../genres/entities/genre.entity.js';
import { GamesService } from './games.service.js';
import { GamesController } from './games.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Publisher, Developer, Genre])],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
