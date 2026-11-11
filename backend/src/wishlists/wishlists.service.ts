import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { CreateWishlistDto } from './dto/create-wishlist.dto.js';
import { UpdateWishlistDto } from './dto/update-wishlist.dto.js';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  async create(createDto: CreateWishlistDto) {
    const { userId, gameId, notifyOnSale } = createDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const game = await this.gameRepository.findOneBy({ id: gameId });
    if (!game) {
      throw new NotFoundException(`Videojuego con ID ${gameId} no encontrado`);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, game: { id: gameId } },
    });
    if (existing) {
      throw new BadRequestException('El juego ya está en la lista de deseos');
    }

    const wish = this.wishlistRepository.create({
      user,
      game,
      notifyOnSale: notifyOnSale ?? true,
    });

    return await this.wishlistRepository.save(wish);
  }

  async findAll() {
    return await this.wishlistRepository.find({
      relations: {
        user: true,
        game: true,
      },
    });
  }

  async findByUser(userId: number) {
    return await this.wishlistRepository.find({
      where: { user: { id: userId } },
      relations: { game: { editions: true } },
    });
  }

  async findOne(id: number) {
    const wish = await this.wishlistRepository.findOne({
      where: { id },
      relations: { user: true, game: true },
    });
    if (!wish) {
      throw new NotFoundException(`Elemento de wishlist ${id} no encontrado`);
    }
    return wish;
  }

  async update(id: number, updateDto: UpdateWishlistDto) {
    const wish = await this.findOne(id);
    this.wishlistRepository.merge(wish, updateDto);
    return await this.wishlistRepository.save(wish);
  }

  async remove(id: number) {
    const wish = await this.findOne(id);
    return await this.wishlistRepository.remove(wish);
  }
}
