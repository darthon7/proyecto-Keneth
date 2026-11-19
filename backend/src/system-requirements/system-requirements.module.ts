import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemRequirement } from './entities/system-requirement.entity.js';
import { GamesModule } from '../games/games.module.js';
import { SystemRequirementsService } from './system-requirements.service.js';
import { SystemRequirementsController } from './system-requirements.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemRequirement]), GamesModule],
  controllers: [SystemRequirementsController],
  providers: [SystemRequirementsService],
  exports: [SystemRequirementsService],
})
export class SystemRequirementsModule {}
