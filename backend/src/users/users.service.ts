import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  hashPassword,
  type SafeUser,
  sanitizeUser,
} from '../auth/index.js';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { GamesService, type GamePlain } from '../games/games.service.js';
import type { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import type { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import type { Wishlist } from '../wishlists/entities/wishlist.entity.js';
import type { Review } from '../reviews/entities/review.entity.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './entities/user-role.enum.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

export type HydratedUserLibrary = UserLibrary & {
  gameEdition: GameEdition & { game: GamePlain | null };
};

export type HydratedWishlist = Wishlist & {
  game: GamePlain | null;
};

export type HydratedReview = Review & {
  game: GamePlain | null;
};

export type HydratedSafeUser = Omit<
  SafeUser,
  'userLibraries' | 'wishlists' | 'reviews'
> & {
  userLibraries?: Array<UserLibrary | HydratedUserLibrary>;
  wishlists?: Array<Wishlist | HydratedWishlist>;
  reviews?: Array<Review | HydratedReview>;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @Optional()
    private readonly gamesService?: GamesService,
  ) {}

  private async hydrateUsersGames(users: User[]): Promise<HydratedSafeUser[]> {
    if (!this.gamesService || users.length === 0) {
      return users.map((user) => sanitizeUser(user));
    }

    const gameIds: number[] = [];
    for (const user of users) {
      for (const lib of user.userLibraries ?? []) {
        if (typeof lib.gameEdition?.gameId === 'number') {
          gameIds.push(lib.gameEdition.gameId);
        }
      }
      for (const wish of user.wishlists ?? []) {
        if (typeof wish.gameId === 'number') {
          gameIds.push(wish.gameId);
        }
      }
      for (const rev of user.reviews ?? []) {
        if (typeof rev.gameId === 'number') {
          gameIds.push(rev.gameId);
        }
      }
    }

    if (gameIds.length === 0) {
      return users.map((user) => sanitizeUser(user));
    }

    const gameMap = await this.gamesService.findByIdsMap(gameIds);

    return users.map((user) => {
      const safe = sanitizeUser(user);
      const hydrated: HydratedSafeUser = {
        ...safe,
        ...(user.userLibraries
          ? {
              userLibraries: user.userLibraries.map((lib) =>
                lib.gameEdition
                  ? {
                      ...lib,
                      gameEdition: {
                        ...lib.gameEdition,
                        game: gameMap.get(lib.gameEdition.gameId) ?? null,
                      },
                    }
                  : lib,
              ),
            }
          : {}),
        ...(user.wishlists
          ? {
              wishlists: user.wishlists.map((wish) => ({
                ...wish,
                game: gameMap.get(wish.gameId) ?? null,
              })),
            }
          : {}),
        ...(user.reviews
          ? {
              reviews: user.reviews.map((rev) => ({
                ...rev,
                game: gameMap.get(rev.gameId) ?? null,
              })),
            }
          : {}),
      };
      return hydrated;
    });
  }

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const normalizedEmail = createUserDto.email.trim().toLowerCase();
    const normalizedUsername = createUserDto.username.trim();
    const existing = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });
    if (existing) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const existingUsername = await this.userRepository.findOneBy({
      username: normalizedUsername,
    });
    if (existingUsername) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    const hashedPassword = await hashPassword(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      email: normalizedEmail,
      username: normalizedUsername,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
    });
    const saved = await this.userRepository.save(user);
    return sanitizeUser(saved);
  }

  async findAll(
    role?: UserRole,
    pagination?: PaginationOptions,
  ): Promise<HydratedSafeUser[]> {
    const { take, skip } = normalizePagination(pagination);
    const users = await this.userRepository.find({
      where: role ? { role } : undefined,
      relations: {
        userLibraries: { gameEdition: true },
        wishlists: true,
        reviews: true,
      },
      take,
      skip,
    });
    return await this.hydrateUsersGames(users);
  }

  private async findEntityOrFail(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        userLibraries: { gameEdition: { platform: true } },
        wishlists: true,
        orders: { items: true },
        reviews: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async findOne(id: number): Promise<HydratedSafeUser> {
    const user = await this.findEntityOrFail(id);
    const [hydrated] = await this.hydrateUsersGames([user]);
    return hydrated;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<HydratedSafeUser> {
    const user = await this.findEntityOrFail(id);
    const safeUpdateData: UpdateUserDto = { ...updateUserDto };
    delete (safeUpdateData as Record<string, unknown>).role;

    if (typeof safeUpdateData.email === 'string') {
      const normalizedEmail = safeUpdateData.email.trim().toLowerCase();
      safeUpdateData.email = normalizedEmail;
      if (normalizedEmail !== user.email.toLowerCase()) {
        const existing = await this.userRepository.findOneBy({
          email: normalizedEmail,
        });
        if (existing && existing.id !== id) {
          throw new ConflictException('El correo ya está registrado');
        }
      }
    }

    if (typeof safeUpdateData.username === 'string') {
      const normalizedUsername = safeUpdateData.username.trim();
      safeUpdateData.username = normalizedUsername;
      if (normalizedUsername !== user.username) {
        const existingUsername = await this.userRepository.findOneBy({
          username: normalizedUsername,
        });
        if (existingUsername && existingUsername.id !== id) {
          throw new ConflictException('El nombre de usuario ya está en uso');
        }
      }
    }

    if (typeof safeUpdateData.password === 'string') {
      safeUpdateData.password = await hashPassword(safeUpdateData.password);
    }
    this.userRepository.merge(user, safeUpdateData);
    const saved = await this.userRepository.save(user);
    const [hydrated] = await this.hydrateUsersGames([saved]);
    return hydrated;
  }

  async updateRole(id: number, role: UserRole): Promise<SafeUser> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    user.role = role;
    const saved = await this.userRepository.save(user);
    return sanitizeUser(saved);
  }

  async remove(id: number): Promise<HydratedSafeUser> {
    const user = await this.findEntityOrFail(id);
    const [hydrated] = await this.hydrateUsersGames([user]);
    await this.userRepository.remove(user);
    return hydrated;
  }
}
