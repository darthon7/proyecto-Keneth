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
import { GamesService, type HydratedGame } from '../games/games.service.js';
import { CreateWishlistDto } from './dto/create-wishlist.dto.js';
import { UpdateWishlistDto } from './dto/update-wishlist.dto.js';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly gamesService: GamesService,
  ) {}

  async create(createDto: CreateWishlistDto) {
    const { userId, gameId, notifyOnSale } = createDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const game = await this.gamesService.findByIdRaw(gameId);
    if (!game) {
      throw new NotFoundException(`Videojuego con ID ${gameId} no encontrado`);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, gameId },
    });
    if (existing) {
      throw new BadRequestException('El juego ya está en la lista de deseos');
    }

    const wish = this.wishlistRepository.create({
      user,
      gameId: game.id,
      notifyOnSale: notifyOnSale ?? true,
    });

    const saved = await this.wishlistRepository.save(wish);
    return this.formatWishlist(saved, game);
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

  private formatWishlist(wish: Wishlist, game?: HydratedGame | null) {
    const sanitized = this.sanitizeWishlist(wish);
    if (game === undefined) {
      return sanitized;
    }
    return {
      ...sanitized,
      game,
    };
  }

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    const wishes = await this.wishlistRepository.find({
      relations: {
        user: true,
      },
      take,
      skip,
    });
    const gameMap = await this.gamesService.findByIdsMap(
      wishes.map((w) => w.gameId),
    );
    return wishes.map((wish) =>
      this.formatWishlist(wish, gameMap.get(wish.gameId) ?? null),
    );
  }

  async findByUser(userId: number) {
    const wishes = await this.wishlistRepository.find({
      where: { user: { id: userId } },
    });
    const gameMap = await this.gamesService.findByIdsMap(
      wishes.map((w) => w.gameId),
      { includeEditions: true },
    );
    return wishes.map((wish) => ({
      ...wish,
      game: gameMap.get(wish.gameId) ?? null,
    }));
  }

  async findOne(id: number) {
    const wish = await this.wishlistRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!wish) {
      throw new NotFoundException(`Elemento de wishlist ${id} no encontrado`);
    }
    const game = await this.gamesService.findByIdRaw(wish.gameId);
    return this.formatWishlist(wish, game);
  }

  async update(id: number, updateDto: UpdateWishlistDto) {
    const wish = await this.wishlistRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!wish) {
      throw new NotFoundException(`Elemento de wishlist ${id} no encontrado`);
    }

    const { gameId, ...rest } = updateDto;
    if (gameId !== undefined) {
      const game = await this.gamesService.findByIdRaw(gameId);
      if (!game) {
        throw new NotFoundException(
          `Videojuego con ID ${gameId} no encontrado`,
        );
      }
      wish.gameId = game.id;
    }

    this.wishlistRepository.merge(wish, rest);
    const saved = await this.wishlistRepository.save(wish);
    const game = await this.gamesService.findByIdRaw(saved.gameId);
    return this.formatWishlist(saved, game);
  }

  async remove(id: number) {
    const wish = await this.wishlistRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!wish) {
      throw new NotFoundException(`Elemento de wishlist ${id} no encontrado`);
    }
    const game = await this.gamesService.findByIdRaw(wish.gameId);
    const removed = await this.wishlistRepository.remove(wish);
    return this.formatWishlist(removed, game);
  }
}
