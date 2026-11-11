import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalKey } from './entities/digital-key.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { DigitalKeysService } from './digital-keys.service.js';
import { DigitalKeysController } from './digital-keys.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([DigitalKey, GameEdition])],
  controllers: [DigitalKeysController],
  providers: [DigitalKeysService],
  exports: [DigitalKeysService],
})
export class DigitalKeysModule {}
