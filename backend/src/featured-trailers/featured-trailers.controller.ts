import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/index.js';
import { Roles, RolesGuard } from '../common/auth/index.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { FeaturedTrailersService } from './featured-trailers.service.js';
import { UpsertFeaturedTrailerDto } from './dto/upsert-featured-trailer.dto.js';

@Controller('featured-trailers')
export class FeaturedTrailersController {
  constructor(private readonly trailersService: FeaturedTrailersService) {}

  @Get()
  findAll() {
    return this.trailersService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':slot')
  upsertSlot(
    @Param('slot', ParseIntPipe) slot: number,
    @Body() dto: UpsertFeaturedTrailerDto,
  ) {
    return this.trailersService.upsertSlot(slot, dto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':slot')
  removeSlot(@Param('slot', ParseIntPipe) slot: number) {
    return this.trailersService.removeSlot(slot);
  }
}
