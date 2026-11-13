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
import { WishlistsService } from './wishlists.service.js';
import { CreateWishlistDto } from './dto/create-wishlist.dto.js';
import { UpdateWishlistDto } from './dto/update-wishlist.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Post()
  create(
    @Body() createDto: CreateWishlistDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      createDto.userId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para modificar la wishlist de otro usuario',
      );
    }
    return this.wishlistsService.create(createDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.wishlistsService.findAll({ limit, offset });
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a la wishlist de este usuario',
      );
    }
    return this.wishlistsService.findByUser(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const wish = await this.wishlistsService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      wish.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este elemento de wishlist',
      );
    }
    return wish;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWishlistDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const wish = await this.wishlistsService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      wish.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para modificar este elemento de wishlist',
      );
    }
    const safeDto = { ...updateDto };
    if (currentUser.role !== UserRole.ADMIN) {
      delete safeDto.userId;
    }
    return this.wishlistsService.update(id, safeDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const wish = await this.wishlistsService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      wish.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este elemento de wishlist',
      );
    }
    return this.wishlistsService.remove(id);
  }
}
