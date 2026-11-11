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
import { SystemRequirementsService } from './system-requirements.service.js';
import { CreateSystemRequirementDto } from './dto/create-system-requirement.dto.js';
import { UpdateSystemRequirementDto } from './dto/update-system-requirement.dto.js';

@Controller('system-requirements')
export class SystemRequirementsController {
  constructor(
    private readonly systemRequirementsService: SystemRequirementsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateSystemRequirementDto) {
    return this.systemRequirementsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.systemRequirementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.systemRequirementsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSystemRequirementDto,
  ) {
    return this.systemRequirementsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.systemRequirementsService.remove(id);
  }
}
