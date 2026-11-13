import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ForbiddenException,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from '../auth/index.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createDto: CreateReviewDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      createDto.userId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para crear reseñas en nombre de otro usuario',
      );
    }
    return this.reviewsService.create(createDto);
  }

  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reviewsService.findAll({ limit, offset });
  }

  @Get('game/:gameId')
  findByGame(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.reviewsService.findByGame(gameId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateReviewDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      review.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para modificar esta reseña',
      );
    }
    const safeDto = { ...updateDto };
    if (currentUser.role !== UserRole.ADMIN) {
      delete safeDto.userId;
      delete safeDto.gameId;
    }
    return this.reviewsService.update(id, safeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      review.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar esta reseña',
      );
    }
    return this.reviewsService.remove(id);
  }
}
