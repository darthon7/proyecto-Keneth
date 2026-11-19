import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameEdition } from './entities/game-edition.entity.js';
import { Platform } from '../platforms/entities/platform.entity.js';
import { DigitalKey } from '../digital-keys/entities/digital-key.entity.js';
import { GamesModule } from '../games/games.module.js';
import { GameEditionsService } from './game-editions.service.js';
import { GameEditionsController } from './game-editions.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameEdition, Platform, DigitalKey]),
    GamesModule,
  ],
  controllers: [GameEditionsController],
  providers: [GameEditionsService],
  exports: [GameEditionsService],
})
export class GameEditionsModule {}
