import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeaturedTrailer } from './entities/featured-trailer.entity.js';
import { FeaturedTrailersController } from './featured-trailers.controller.js';
import { FeaturedTrailersService } from './featured-trailers.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([FeaturedTrailer])],
  controllers: [FeaturedTrailersController],
  providers: [FeaturedTrailersService],
  exports: [FeaturedTrailersService],
})
export class FeaturedTrailersModule {}
