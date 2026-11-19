import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sanitizeUser } from '../auth/index.js';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { UserLibrary } from './entities/user-library.entity.js';
import { User } from '../users/entities/user.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { GamesService } from '../games/games.service.js';
import { CreateUserLibraryDto } from './dto/create-user-library.dto.js';
import { UpdateUserLibraryDto } from './dto/update-user-library.dto.js';

@Injectable()
export class UserLibrariesService {
  constructor(
    @InjectRepository(UserLibrary)
    private readonly libraryRepository: Repository<UserLibrary>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly gamesService: GamesService,
  ) {}

  async create(createDto: CreateUserLibraryDto) {
    const { userId, gameEditionId, orderId, isRevoked } = createDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const edition = await this.editionRepository.findOneBy({
      id: gameEditionId,
    });
    if (!edition) {
      throw new NotFoundException(
        `Edición con ID ${gameEditionId} no encontrada`,
      );
    }

    let order: Order | null = null;
    if (orderId) {
      order = await this.orderRepository.findOneBy({ id: orderId });
    }

    const entry = this.libraryRepository.create({
      user,
      gameEdition: edition,
      order: order ?? undefined,
      isRevoked: isRevoked ?? false,
    });

    const saved = await this.libraryRepository.save(entry);
    return this.sanitizeEntry(saved);
  }

  private sanitizeEntry(entry: UserLibrary) {
    if (!entry.user) {
      return entry;
    }
    return {
      ...entry,
      user: sanitizeUser(entry.user),
    };
  }

  private async hydrateEntries(entries: UserLibrary[], sanitize = true) {
    const gameIds = entries
      .map((entry) => entry.gameEdition?.gameId)
      .filter((id): id is number => typeof id === 'number');
    const gameMap = await this.gamesService.findByIdsMap(gameIds);

    return entries.map((entry) => {
      const base = sanitize ? this.sanitizeEntry(entry) : entry;
      if (!entry.gameEdition) {
        return base;
      }
      return {
        ...base,
        gameEdition: {
          ...entry.gameEdition,
          game: gameMap.get(entry.gameEdition.gameId) ?? null,
        },
      };
    });
  }

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    const entries = await this.libraryRepository.find({
      relations: {
        user: true,
        gameEdition: { platform: true },
        order: true,
      },
      take,
      skip,
    });
    return await this.hydrateEntries(entries, true);
  }

  private async findEntityOrFail(id: number): Promise<UserLibrary> {
    const entry = await this.libraryRepository.findOne({
      where: { id },
      relations: {
        user: true,
        gameEdition: { platform: true },
        order: true,
      },
    });
    if (!entry) {
      throw new NotFoundException(`Registro de biblioteca ${id} no encontrado`);
    }
    return entry;
  }

  async findOne(id: number) {
    const entry = await this.findEntityOrFail(id);
    const [hydrated] = await this.hydrateEntries([entry], true);
    return hydrated;
  }

  async findByUser(userId: number) {
    const entries = await this.libraryRepository.find({
      where: { user: { id: userId }, isRevoked: false },
      relations: {
        gameEdition: { platform: true },
        order: { items: { digitalKey: true, gameEdition: true } },
      },
    });
    return await this.hydrateEntries(entries, false);
  }

  async update(id: number, updateDto: UpdateUserLibraryDto) {
    const entry = await this.findEntityOrFail(id);
    this.libraryRepository.merge(entry, updateDto);
    const saved = await this.libraryRepository.save(entry);
    const [hydrated] = await this.hydrateEntries([saved], true);
    return hydrated;
  }

  async remove(id: number) {
    const entry = await this.findEntityOrFail(id);
    const [hydrated] = await this.hydrateEntries([entry], true);
    await this.libraryRepository.remove(entry);
    return hydrated;
  }
}
