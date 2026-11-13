import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/index.js';
import { Roles, RolesGuard } from '../common/auth/index.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { DigitalKeysService } from './digital-keys.service.js';
import { CreateDigitalKeyDto } from './dto/create-digital-key.dto.js';
import { UpdateDigitalKeyDto } from './dto/update-digital-key.dto.js';

@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('digital-keys')
export class DigitalKeysController {
  constructor(private readonly digitalKeysService: DigitalKeysService) {}

  @Post()
  create(@Body() createDto: CreateDigitalKeyDto) {
    return this.digitalKeysService.create(createDto);
  }

  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.digitalKeysService.findAll({ limit, offset });
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
