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
import { SystemRequirementsService } from './system-requirements.service.js';
import { CreateSystemRequirementDto } from './dto/create-system-requirement.dto.js';
import { UpdateSystemRequirementDto } from './dto/update-system-requirement.dto.js';

@Controller('system-requirements')
export class SystemRequirementsController {
  constructor(
    private readonly systemRequirementsService: SystemRequirementsService,
  ) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
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

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSystemRequirementDto,
  ) {
    return this.systemRequirementsService.update(id, updateDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.systemRequirementsService.remove(id);
  }
}
