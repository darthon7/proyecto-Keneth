import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity.js';
import { GamesModule } from '../games/games.module.js';
import { GenresService } from './genres.service.js';
import { GenresController } from './genres.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Genre]), GamesModule],
  controllers: [GenresController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
