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
import { Roles, RolesGuard } from '../common/auth/index.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { UserLibrariesService } from './user-libraries.service.js';
import { CreateUserLibraryDto } from './dto/create-user-library.dto.js';
import { UpdateUserLibraryDto } from './dto/update-user-library.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('user-libraries')
export class UserLibrariesController {
  constructor(private readonly userLibrariesService: UserLibrariesService) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() createDto: CreateUserLibraryDto) {
    return this.userLibrariesService.create(createDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userLibrariesService.findAll({ limit, offset });
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a la biblioteca de este usuario',
      );
    }
    return this.userLibrariesService.findByUser(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const entry = await this.userLibrariesService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      entry.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este registro de biblioteca',
      );
    }
    return entry;
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserLibraryDto,
  ) {
    return this.userLibrariesService.update(id, updateDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userLibrariesService.remove(id);
  }
}
