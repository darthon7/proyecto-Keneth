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
import { JwtAuthGuard } from '../auth/index.js';
import { Roles, RolesGuard } from '../common/auth/index.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { GameEditionsService } from './game-editions.service.js';
import { CreateGameEditionDto } from './dto/create-game-edition.dto.js';
import { UpdateGameEditionDto } from './dto/update-game-edition.dto.js';

@Controller('game-editions')
export class GameEditionsController {
  constructor(private readonly gameEditionsService: GameEditionsService) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() createDto: CreateGameEditionDto) {
    return this.gameEditionsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.gameEditionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gameEditionsService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGameEditionDto,
  ) {
    return this.gameEditionsService.update(id, updateDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gameEditionsService.remove(id);
  }
}
