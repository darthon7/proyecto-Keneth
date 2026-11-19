import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game, GameSchema } from './schemas/game.schema.js';
import { Counter, CounterSchema } from './schemas/counter.schema.js';
import { Publisher } from '../publishers/entities/publisher.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { Genre } from '../genres/entities/genre.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { SystemRequirement } from '../system-requirements/entities/system-requirement.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { GamesService } from './games.service.js';
import { GamesController } from './games.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    TypeOrmModule.forFeature([
      Publisher,
      Developer,
      Genre,
      GameEdition,
      SystemRequirement,
      Review,
    ]),
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
