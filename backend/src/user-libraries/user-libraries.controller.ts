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
import { UserLibrariesService } from './user-libraries.service.js';
import { CreateUserLibraryDto } from './dto/create-user-library.dto.js';
import { UpdateUserLibraryDto } from './dto/update-user-library.dto.js';

@Controller('user-libraries')
export class UserLibrariesController {
  constructor(private readonly userLibrariesService: UserLibrariesService) {}

  @Post()
  create(@Body() createDto: CreateUserLibraryDto) {
    return this.userLibrariesService.create(createDto);
  }

  @Get()
  findAll() {
    return this.userLibrariesService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.userLibrariesService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userLibrariesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserLibraryDto,
  ) {
    return this.userLibrariesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userLibrariesService.remove(id);
  }
}
