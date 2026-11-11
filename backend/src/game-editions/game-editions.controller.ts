import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { GameEditionsService } from './game-editions.service.js';
import { CreateGameEditionDto } from './dto/create-game-edition.dto.js';
import { UpdateGameEditionDto } from './dto/update-game-edition.dto.js';

@Controller('game-editions')
export class GameEditionsController {
  constructor(private readonly gameEditionsService: GameEditionsService) {}

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

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGameEditionDto,
  ) {
    return this.gameEditionsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gameEditionsService.remove(id);
  }
}
