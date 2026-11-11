import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DigitalKeysService } from './digital-keys.service.js';
import { CreateDigitalKeyDto } from './dto/create-digital-key.dto.js';
import { UpdateDigitalKeyDto } from './dto/update-digital-key.dto.js';

@Controller('digital-keys')
export class DigitalKeysController {
  constructor(private readonly digitalKeysService: DigitalKeysService) {}

  @Post()
  create(@Body() createDto: CreateDigitalKeyDto) {
    return this.digitalKeysService.create(createDto);
  }

  @Get()
  findAll() {
    return this.digitalKeysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.digitalKeysService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDigitalKeyDto) {
    return this.digitalKeysService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.digitalKeysService.remove(id);
  }
}
