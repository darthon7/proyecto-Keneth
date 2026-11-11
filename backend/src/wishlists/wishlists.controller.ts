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
import { WishlistsService } from './wishlists.service.js';
import { CreateWishlistDto } from './dto/create-wishlist.dto.js';
import { UpdateWishlistDto } from './dto/update-wishlist.dto.js';

@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Post()
  create(@Body() createDto: CreateWishlistDto) {
    return this.wishlistsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.wishlistsService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.wishlistsService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wishlistsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWishlistDto,
  ) {
    return this.wishlistsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.wishlistsService.remove(id);
  }
}
