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
import { Review } from './entities/review.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { GamesService, type GamePlain } from '../games/games.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserLibrary)
    private readonly libraryRepository: Repository<UserLibrary>,

    private readonly gamesService: GamesService,
  ) {}

  async create(createDto: CreateReviewDto) {
    const { userId, gameId, rating, title, body, helpfulCount } = createDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const game = await this.gamesService.findByIdRaw(gameId);
    if (!game) {
      throw new NotFoundException(`Videojuego con ID ${gameId} no encontrado`);
    }

    // Verificar si el usuario ya escribió una reseña para este juego
    const existing = await this.reviewRepository.findOne({
      where: { user: { id: userId }, gameId },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya has escrito una reseña para este videojuego',
      );
    }

    // Certificar si es compra verificada consultando la biblioteca del usuario
    const libraryEntry = await this.libraryRepository.findOne({
      where: {
        user: { id: userId },
        gameEdition: { gameId },
        isRevoked: false,
      },
      relations: { gameEdition: true },
    });

    const isVerifiedPurchase = !!libraryEntry;

    const review = this.reviewRepository.create({
      user,
      gameId: game.id,
      rating,
      title,
      body,
      isVerifiedPurchase,
      helpfulCount: helpfulCount ?? 0,
    });

    const saved = await this.reviewRepository.save(review);
    return this.formatReview(saved, game);
  }

  private sanitizeReview(review: Review) {
    if (!review.user) {
      return review;
    }
    return {
      ...review,
      user: sanitizeUser(review.user),
    };
  }

  private formatReview(review: Review, game?: GamePlain | null) {
    const sanitized = this.sanitizeReview(review);
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
    const reviews = await this.reviewRepository.find({
      relations: {
        user: true,
      },
      take,
      skip,
    });
    const gameMap = await this.gamesService.findByIdsMap(
      reviews.map((r) => r.gameId),
    );
    return reviews.map((review) =>
      this.formatReview(review, gameMap.get(review.gameId) ?? null),
    );
  }

  async findByGame(gameId: number) {
    const reviews = await this.reviewRepository.find({
      where: { gameId },
      relations: { user: true },
    });
    return reviews.map((review) => this.sanitizeReview(review));
  }

  async findOne(id: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!review) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    const game = await this.gamesService.findByIdRaw(review.gameId);
    return this.formatReview(review, game);
  }

  async update(id: number, updateDto: UpdateReviewDto) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!review) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }

    const { gameId, ...rest } = updateDto;
    if (gameId !== undefined) {
      const game = await this.gamesService.findByIdRaw(gameId);
      if (!game) {
        throw new NotFoundException(
          `Videojuego con ID ${gameId} no encontrado`,
        );
      }
      review.gameId = game.id;
    }

    this.reviewRepository.merge(review, rest);
    const saved = await this.reviewRepository.save(review);
    const game = await this.gamesService.findByIdRaw(saved.gameId);
    return this.formatReview(saved, game);
  }

  async remove(id: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!review) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    const game = await this.gamesService.findByIdRaw(review.gameId);
    const removed = await this.reviewRepository.remove(review);
    return this.formatReview(removed, game);
  }
}
