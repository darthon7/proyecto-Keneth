import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from './entities/platform.entity.js';
import { PlatformsService } from './platforms.service.js';
import { PlatformsController } from './platforms.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Platform])],
  controllers: [PlatformsController],
  providers: [PlatformsService],
  exports: [PlatformsService],
})
export class PlatformsModule {}
