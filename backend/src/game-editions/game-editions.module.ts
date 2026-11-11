import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameEdition } from './entities/game-edition.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { Platform } from '../platforms/entities/platform.entity.js';
import { GameEditionsService } from './game-editions.service.js';
import { GameEditionsController } from './game-editions.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([GameEdition, Game, Platform])],
  controllers: [GameEditionsController],
  providers: [GameEditionsService],
  exports: [GameEditionsService],
})
export class GameEditionsModule {}
