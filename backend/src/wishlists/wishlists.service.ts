import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sanitizeUser } from '../auth/index.js';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
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

    const saved = await this.wishlistRepository.save(wish);
    return this.sanitizeWishlist(saved);
  }

  private sanitizeWishlist(wish: Wishlist) {
    if (!wish.user) {
      return wish;
    }
    return {
      ...wish,
      user: sanitizeUser(wish.user),
    };
  }

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    const wishes = await this.wishlistRepository.find({
      relations: {
        user: true,
        game: true,
      },
      take,
      skip,
    });
    return wishes.map((wish) => this.sanitizeWishlist(wish));
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
    return this.sanitizeWishlist(wish);
  }

  async update(id: number, updateDto: UpdateWishlistDto) {
    const wish = await this.wishlistRepository.findOne({
      where: { id },
      relations: { user: true, game: true },
    });
    if (!wish) {
      throw new NotFoundException(`Elemento de wishlist ${id} no encontrado`);
    }
    this.wishlistRepository.merge(wish, updateDto);
    const saved = await this.wishlistRepository.save(wish);
    return this.sanitizeWishlist(saved);
  }

  async remove(id: number) {
    const wish = await this.wishlistRepository.findOne({
      where: { id },
      relations: { user: true, game: true },
    });
    if (!wish) {
      throw new NotFoundException(`Elemento de wishlist ${id} no encontrado`);
    }
    const removed = await this.wishlistRepository.remove(wish);
    return this.sanitizeWishlist(removed);
  }
}
