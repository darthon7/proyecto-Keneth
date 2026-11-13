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
import { Game } from '../games/entities/game.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,

    @InjectRepository(UserLibrary)
    private readonly libraryRepository: Repository<UserLibrary>,
  ) {}

  async create(createDto: CreateReviewDto) {
    const { userId, gameId, rating, title, body, helpfulCount } = createDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const game = await this.gameRepository.findOneBy({ id: gameId });
    if (!game) {
      throw new NotFoundException(`Videojuego con ID ${gameId} no encontrado`);
    }

    // Verificar si el usuario ya escribió una reseña para este juego
    const existing = await this.reviewRepository.findOne({
      where: { user: { id: userId }, game: { id: gameId } },
    });
    if (existing) {
      throw new BadRequestException('Ya has escrito una reseña para este videojuego');
    }

    // Certificar si es compra verificada consultando la biblioteca del usuario
    const libraryEntry = await this.libraryRepository.findOne({
      where: {
        user: { id: userId },
        gameEdition: { game: { id: gameId } },
        isRevoked: false,
      },
      relations: { gameEdition: { game: true } },
    });

    const isVerifiedPurchase = !!libraryEntry;

    const review = this.reviewRepository.create({
      user,
      game,
      rating,
      title,
      body,
      isVerifiedPurchase,
      helpfulCount: helpfulCount ?? 0,
    });

    const saved = await this.reviewRepository.save(review);
    return this.sanitizeReview(saved);
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

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    const reviews = await this.reviewRepository.find({
      relations: {
        user: true,
        game: true,
      },
      take,
      skip,
    });
    return reviews.map((review) => this.sanitizeReview(review));
  }

  async findByGame(gameId: number) {
    const reviews = await this.reviewRepository.find({
      where: { game: { id: gameId } },
      relations: { user: true },
    });
    return reviews.map((review) => this.sanitizeReview(review));
  }

  async findOne(id: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: { user: true, game: true },
    });
    if (!review) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    return this.sanitizeReview(review);
  }

  async update(id: number, updateDto: UpdateReviewDto) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: { user: true, game: true },
    });
    if (!review) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    this.reviewRepository.merge(review, updateDto);
    const saved = await this.reviewRepository.save(review);
    return this.sanitizeReview(saved);
  }

  async remove(id: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: { user: true, game: true },
    });
    if (!review) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    const removed = await this.reviewRepository.remove(review);
    return this.sanitizeReview(removed);
  }
}
