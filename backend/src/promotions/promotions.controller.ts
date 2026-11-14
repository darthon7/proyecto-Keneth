import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Public, type AuthenticatedUser } from '../auth/index.js';
import { Roles, RolesGuard } from '../common/auth/index.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { PromotionsService } from './promotions.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() createDto: CreatePromotionDto) {
    return this.promotionsService.create(createDto);
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return this.promotionsService.findAll(user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.promotionsService.findForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, updateDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
