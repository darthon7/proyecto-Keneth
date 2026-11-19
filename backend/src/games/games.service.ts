import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Model } from 'mongoose';
import { DataSource, In, Repository } from 'typeorm';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { validateActivationDateRange } from '../common/date-validation.util.js';
import { Game, type GameDocument } from './schemas/game.schema.js';
import { Counter, type CounterDocument } from './schemas/counter.schema.js';
import { Publisher } from '../publishers/entities/publisher.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { Genre } from '../genres/entities/genre.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { SystemRequirement } from '../system-requirements/entities/system-requirement.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { Wishlist } from '../wishlists/entities/wishlist.entity.js';
import { DigitalKey } from '../digital-keys/entities/digital-key.entity.js';
import {
  sanitizeDigitalKeys,
  type PublicDigitalKey,
} from '../digital-keys/digital-key.sanitizer.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { UpdateGameDto } from './dto/update-game.dto.js';
import { ApplyDiscountCampaignDto } from './dto/apply-discount-campaign.dto.js';

export interface GamePlain {
  id: number;
  title: string;
  slug: string;
  synopsis: string | null;
  esrbRating: string;
  releaseDate: string;
  coverImageUrl: string | null;
  discountCampaignName: string | null;
  discountPercentage: number;
  discountStartDate: Date | null;
  discountEndDate: Date | null;
  publisherId: number;
  developerId: number;
  genreIds: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type HydratedGameEdition = Omit<GameEdition, 'digitalKeys'> & {
  digitalKeys?: PublicDigitalKey[];
};

export interface HydratedGame extends GamePlain {
  publisher?: Publisher | null;
  developer?: Developer | null;
  genres?: Genre[];
  editions?: HydratedGameEdition[];
  systemRequirements?: SystemRequirement[];
  reviews?: Review[];
}

export interface HydrateOptions {
  includePublisher?: boolean;
  includeDeveloper?: boolean;
  includeGenres?: boolean;
  includeEditions?: boolean;
  includeRequirements?: boolean;
  includeReviews?: boolean;
}

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    @InjectModel(Game.name)
    private readonly gameModel: Model<GameDocument>,

    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,

    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,

    @InjectRepository(Developer)
    private readonly developerRepository: Repository<Developer>,

    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,

    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,

    @InjectRepository(SystemRequirement)
    private readonly requirementRepository: Repository<SystemRequirement>,

    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getMongoModels(): {
    gameModel: Model<GameDocument>;
    counterModel: Model<CounterDocument>;
  } {
    return {
      gameModel: this.gameModel,
      counterModel: this.counterModel,
    };
  }

  private toPlainGame(
    doc: Partial<Game> & { createdAt?: Date; updatedAt?: Date },
  ): GamePlain {
    return {
      id: Number(doc.id),
      title: String(doc.title),
      slug: String(doc.slug),
      synopsis: doc.synopsis ?? null,
      esrbRating: String(doc.esrbRating ?? 'E'),
      releaseDate: String(doc.releaseDate),
      coverImageUrl: doc.coverImageUrl ?? null,
      discountCampaignName: doc.discountCampaignName ?? null,
      discountPercentage: Number(doc.discountPercentage ?? 0),
      discountStartDate: doc.discountStartDate ?? null,
      discountEndDate: doc.discountEndDate ?? null,
      publisherId: Number(doc.publisherId),
      developerId: Number(doc.developerId),
      genreIds: Array.isArray(doc.genreIds)
        ? doc.genreIds.map((gid) => Number(gid))
        : [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private isSlugDuplicateKeyError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const err = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };
    if (err.code !== 11000) {
      return false;
    }
    if (err.keyPattern) {
      return 'slug' in err.keyPattern;
    }
    if (err.keyValue) {
      return 'slug' in err.keyValue;
    }
    return false;
  }

  private groupByGameId<T extends { gameId: number }>(
    items: T[],
  ): Map<number, T[]> {
    const grouped = new Map<number, T[]>();
    for (const item of items) {
      const list = grouped.get(item.gameId) ?? [];
      list.push(item);
      grouped.set(item.gameId, list);
    }
    return grouped;
  }

  private async resolveValidGenres(genreIds: number[]): Promise<Genre[]> {
    const uniqueGenreIds = [...new Set(genreIds)];
    if (uniqueGenreIds.length === 0) {
      return [];
    }
    const genres = await this.genreRepository.find({
      where: { id: In(uniqueGenreIds) },
    });
    if (genres.length !== uniqueGenreIds.length) {
      const foundIds = new Set(genres.map((g) => g.id));
      const missingIds = uniqueGenreIds.filter((gid) => !foundIds.has(gid));
      throw new NotFoundException(
        `Los siguientes géneros no existen: ${missingIds.join(', ')}`,
      );
    }
    return genres;
  }

  private async loadSanitizedEditionsByGameIds(
    gameIds: number[],
  ): Promise<HydratedGameEdition[]> {
    if (gameIds.length === 0) {
      return [];
    }
    const editions = await this.editionRepository
      .createQueryBuilder('edition')
      .leftJoinAndSelect('edition.platform', 'platform')
      .leftJoin('edition.digitalKeys', 'dk')
      .addSelect(['dk.id', 'dk.status', 'dk.batchId', 'dk.updatedAt'])
      .where('edition.gameId IN (:...gameIds)', { gameIds })
      .getMany();

    return editions.map((edition) => ({
      ...edition,
      digitalKeys: sanitizeDigitalKeys(edition.digitalKeys),
    }));
  }

  private async getNextGameId(): Promise<number> {
    const existingCounter = await this.counterModel
      .findById('games')
      .lean()
      .exec();
    if (!existingCounter) {
      const maxGame = await this.gameModel
        .findOne({}, { id: 1 })
        .sort({ id: -1 })
        .lean()
        .exec();
      const baseSeq = maxGame?.id ?? 0;
      await this.counterModel.updateOne(
        { _id: 'games' },
        { $setOnInsert: { seq: baseSeq } },
        { upsert: true },
      );
    }

    const counter = await this.counterModel
      .findOneAndUpdate(
        { _id: 'games' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' },
      )
      .lean()
      .exec();

    return counter!.seq;
  }

  private async hydrateGames(
    plainGames: GamePlain[],
    options: HydrateOptions = {},
  ): Promise<HydratedGame[]> {
    if (plainGames.length === 0) {
      return [];
    }

    const {
      includePublisher = true,
      includeDeveloper = true,
      includeGenres = true,
      includeEditions = false,
      includeRequirements = false,
      includeReviews = false,
    } = options;

    const gameIds = plainGames.map((g) => g.id);
    const publisherIds = includePublisher
      ? [
          ...new Set(
            plainGames.map((g) => g.publisherId).filter((id) => id > 0),
          ),
        ]
      : [];
    const developerIds = includeDeveloper
      ? [
          ...new Set(
            plainGames.map((g) => g.developerId).filter((id) => id > 0),
          ),
        ]
      : [];
    const genreIds = includeGenres
      ? [
          ...new Set(
            plainGames.flatMap((g) => g.genreIds ?? []).filter((id) => id > 0),
          ),
        ]
      : [];

    const [
      publishers,
      developers,
      genres,
      editions,
      requirements,
      reviews,
    ] = await Promise.all([
      publisherIds.length > 0
        ? this.publisherRepository.find({ where: { id: In(publisherIds) } })
        : Promise.resolve([] as Publisher[]),
      developerIds.length > 0
        ? this.developerRepository.find({ where: { id: In(developerIds) } })
        : Promise.resolve([] as Developer[]),
      genreIds.length > 0
        ? this.genreRepository.find({ where: { id: In(genreIds) } })
        : Promise.resolve([] as Genre[]),
      includeEditions
        ? this.loadSanitizedEditionsByGameIds(gameIds)
        : Promise.resolve([] as HydratedGameEdition[]),
      includeRequirements
        ? this.requirementRepository.find({ where: { gameId: In(gameIds) } })
        : Promise.resolve([] as SystemRequirement[]),
      includeReviews
        ? this.reviewRepository.find({ where: { gameId: In(gameIds) } })
        : Promise.resolve([] as Review[]),
    ]);

    const publisherMap = new Map(publishers.map((p) => [p.id, p]));
    const developerMap = new Map(developers.map((d) => [d.id, d]));
    const genreMap = new Map(genres.map((g) => [g.id, g]));
    const editionsMap = this.groupByGameId(editions);
    const requirementsMap = this.groupByGameId(requirements);
    const reviewsMap = this.groupByGameId(reviews);

    return plainGames.map((game) => {
      const hydrated: HydratedGame = { ...game };
      if (includePublisher) {
        hydrated.publisher = publisherMap.get(game.publisherId) ?? null;
      }
      if (includeDeveloper) {
        hydrated.developer = developerMap.get(game.developerId) ?? null;
      }
      if (includeGenres) {
        hydrated.genres = (game.genreIds ?? [])
          .map((gid) => genreMap.get(gid))
          .filter((g): g is Genre => Boolean(g));
      }
      if (includeEditions) {
        hydrated.editions = editionsMap.get(game.id) ?? [];
      }
      if (includeRequirements) {
        hydrated.systemRequirements = requirementsMap.get(game.id) ?? [];
      }
      if (includeReviews) {
        hydrated.reviews = reviewsMap.get(game.id) ?? [];
      }
      return hydrated;
    });
  }

  async create(createGameDto: CreateGameDto): Promise<HydratedGame> {
    const {
      publisherId,
      developerId,
      genreIds,
      discountStartDate,
      discountEndDate,
      ...datos
    } = createGameDto;

    const publisher = await this.publisherRepository.findOneBy({
      id: publisherId,
    });
    if (!publisher) {
      throw new NotFoundException(
        `El publisher con ID ${publisherId} no existe`,
      );
    }

    const developer = await this.developerRepository.findOneBy({
      id: developerId,
    });
    if (!developer) {
      throw new NotFoundException(
        `El developer con ID ${developerId} no existe`,
      );
    }

    const existingSlug = await this.gameModel
      .findOne({ slug: datos.slug })
      .lean()
      .exec();
    if (existingSlug) {
      throw new ConflictException(
        `Ya existe un videojuego con el slug "${datos.slug}"`,
      );
    }

    const genres =
      genreIds && genreIds.length > 0
        ? await this.resolveValidGenres(genreIds)
        : [];

    const parsedDiscountStart = discountStartDate
      ? new Date(discountStartDate)
      : null;
    const parsedDiscountEnd = discountEndDate
      ? new Date(discountEndDate)
      : null;
    if (
      (datos.discountPercentage ?? 0) > 0 &&
      (parsedDiscountStart || parsedDiscountEnd)
    ) {
      validateActivationDateRange({
        startDate: parsedDiscountStart,
        endDate: parsedDiscountEnd,
        requireNotBeforeTodayOnStart: Boolean(parsedDiscountStart),
        requireNotBeforeTodayOnEnd: Boolean(parsedDiscountEnd),
      });
    }

    const nextId = await this.getNextGameId();

    try {
      const createdDoc = await this.gameModel.create({
        id: nextId,
        ...datos,
        synopsis: datos.synopsis ?? null,
        esrbRating: datos.esrbRating ?? 'E',
        coverImageUrl: datos.coverImageUrl ?? null,
        discountCampaignName: datos.discountCampaignName ?? null,
        discountPercentage: datos.discountPercentage ?? 0,
        discountStartDate: parsedDiscountStart,
        discountEndDate: parsedDiscountEnd,
        publisherId: publisher.id,
        developerId: developer.id,
        genreIds: genres.map((g) => g.id),
      });

      const plain = this.toPlainGame(createdDoc.toObject());
      return {
        ...plain,
        publisher,
        developer,
        genres,
      };
    } catch (error) {
      if (this.isSlugDuplicateKeyError(error)) {
        throw new ConflictException(
          `Ya existe un videojuego con el slug "${datos.slug}"`,
        );
      }
      throw error;
    }
  }

  async findAll(pagination?: PaginationOptions): Promise<HydratedGame[]> {
    const { take, skip } = normalizePagination(pagination);
    const docs = await this.gameModel
      .find()
      .sort({ id: 1 })
      .skip(skip)
      .limit(take)
      .lean()
      .exec();

    const plainGames = docs.map((doc) => this.toPlainGame(doc));
    return await this.hydrateGames(plainGames, {
      includePublisher: true,
      includeDeveloper: true,
      includeGenres: true,
      includeEditions: true,
      includeRequirements: true,
    });
  }

  async findOne(id: number): Promise<HydratedGame> {
    const doc = await this.gameModel.findOne({ id }).lean().exec();
    if (!doc) {
      throw new NotFoundException(
        `El videojuego con ID ${id} no fue encontrado`,
      );
    }

    const [hydrated] = await this.hydrateGames([this.toPlainGame(doc)], {
      includePublisher: true,
      includeDeveloper: true,
      includeGenres: true,
      includeEditions: true,
      includeRequirements: true,
      includeReviews: true,
    });
    return hydrated;
  }

  async findByIdRaw(id: number): Promise<GamePlain | null> {
    const doc = await this.gameModel.findOne({ id }).lean().exec();
    return doc ? this.toPlainGame(doc) : null;
  }

  async findByIdsMap(
    ids: number[],
    options: HydrateOptions = {
      includePublisher: false,
      includeDeveloper: false,
      includeGenres: false,
      includeEditions: false,
      includeRequirements: false,
      includeReviews: false,
    },
  ): Promise<Map<number, HydratedGame>> {
    const uniqueIds = [...new Set(ids.filter((id) => Number.isFinite(id)))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const docs = await this.gameModel
      .find({ id: { $in: uniqueIds } })
      .lean()
      .exec();
    const plainGames = docs.map((doc) => this.toPlainGame(doc));

    const needsHydration = Boolean(
      options.includePublisher ||
        options.includeDeveloper ||
        options.includeGenres ||
        options.includeEditions ||
        options.includeRequirements ||
        options.includeReviews,
    );

    const hydrated = needsHydration
      ? await this.hydrateGames(plainGames, options)
      : plainGames;

    return new Map(hydrated.map((g) => [g.id, g]));
  }

  async findByPublisherIds(
    publisherIds: number[],
  ): Promise<Map<number, GamePlain[]>> {
    const uniqueIds = [...new Set(publisherIds)];
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const docs = await this.gameModel
      .find({ publisherId: { $in: uniqueIds } })
      .sort({ id: 1 })
      .lean()
      .exec();

    const map = new Map<number, GamePlain[]>();
    for (const doc of docs) {
      const plain = this.toPlainGame(doc);
      const list = map.get(plain.publisherId) ?? [];
      list.push(plain);
      map.set(plain.publisherId, list);
    }
    return map;
  }

  async findByDeveloperIds(
    developerIds: number[],
  ): Promise<Map<number, GamePlain[]>> {
    const uniqueIds = [...new Set(developerIds)];
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const docs = await this.gameModel
      .find({ developerId: { $in: uniqueIds } })
      .sort({ id: 1 })
      .lean()
      .exec();

    const map = new Map<number, GamePlain[]>();
    for (const doc of docs) {
      const plain = this.toPlainGame(doc);
      const list = map.get(plain.developerId) ?? [];
      list.push(plain);
      map.set(plain.developerId, list);
    }
    return map;
  }

  async findByGenreIds(genreIds: number[]): Promise<Map<number, GamePlain[]>> {
    const uniqueIds = [...new Set(genreIds)];
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const docs = await this.gameModel
      .find({ genreIds: { $in: uniqueIds } })
      .sort({ id: 1 })
      .lean()
      .exec();

    const targetSet = new Set(uniqueIds);
    const map = new Map<number, GamePlain[]>();
    for (const doc of docs) {
      const plain = this.toPlainGame(doc);
      for (const gid of plain.genreIds) {
        if (!targetSet.has(gid)) continue;
        const list = map.get(gid) ?? [];
        list.push(plain);
        map.set(gid, list);
      }
    }
    return map;
  }

  async count(): Promise<number> {
    return await this.gameModel.countDocuments().exec();
  }

  async countByPublisherId(publisherId: number): Promise<number> {
    return await this.gameModel.countDocuments({ publisherId }).exec();
  }

  async countByDeveloperId(developerId: number): Promise<number> {
    return await this.gameModel.countDocuments({ developerId }).exec();
  }

  async removeGenreFromGames(genreId: number): Promise<void> {
    await this.gameModel
      .updateMany({ genreIds: genreId }, { $pull: { genreIds: genreId } })
      .exec();
  }

  async addGenreToGames(genreId: number, gameIds: number[]): Promise<void> {
    if (gameIds.length === 0) {
      return;
    }
    await this.gameModel
      .updateMany(
        { id: { $in: gameIds } },
        { $addToSet: { genreIds: genreId } },
      )
      .exec();
  }

  async update(id: number, updateGameDto: UpdateGameDto): Promise<HydratedGame> {
    const existingDoc = await this.gameModel.findOne({ id }).exec();
    if (!existingDoc) {
      throw new NotFoundException(
        `El videojuego con ID ${id} no fue encontrado`,
      );
    }

    const {
      publisherId,
      developerId,
      genreIds,
      discountStartDate,
      discountEndDate,
      ...datos
    } = updateGameDto;

    if (datos.slug && datos.slug !== existingDoc.slug) {
      const slugTaken = await this.gameModel
        .findOne({ slug: datos.slug, id: { $ne: id } })
        .lean()
        .exec();
      if (slugTaken) {
        throw new ConflictException(
          `Ya existe un videojuego con el slug "${datos.slug}"`,
        );
      }
    }

    if (publisherId) {
      const publisher = await this.publisherRepository.findOneBy({
        id: publisherId,
      });
      if (!publisher) {
        throw new NotFoundException(
          `El publisher con ID ${publisherId} no existe`,
        );
      }
      existingDoc.publisherId = publisher.id;
    }

    if (developerId) {
      const developer = await this.developerRepository.findOneBy({
        id: developerId,
      });
      if (!developer) {
        throw new NotFoundException(
          `El developer con ID ${developerId} no existe`,
        );
      }
      existingDoc.developerId = developer.id;
    }

    if (genreIds !== undefined) {
      const genres = await this.resolveValidGenres(genreIds);
      existingDoc.genreIds = genres.map((g) => g.id);
    }

    const nextDiscountStart =
      discountStartDate !== undefined
        ? discountStartDate
          ? new Date(discountStartDate)
          : null
        : existingDoc.discountStartDate;
    const nextDiscountEnd =
      discountEndDate !== undefined
        ? discountEndDate
          ? new Date(discountEndDate)
          : null
        : existingDoc.discountEndDate;
    const effectiveDiscountPercentage =
      datos.discountPercentage ?? Number(existingDoc.discountPercentage ?? 0);

    if (
      effectiveDiscountPercentage > 0 &&
      (discountStartDate !== undefined || discountEndDate !== undefined)
    ) {
      validateActivationDateRange({
        startDate: nextDiscountStart,
        endDate: nextDiscountEnd,
        requireNotBeforeTodayOnStart:
          discountStartDate !== undefined && nextDiscountStart !== null,
        requireNotBeforeTodayOnEnd:
          discountEndDate !== undefined && nextDiscountEnd !== null,
      });
    }

    const definedDatos = Object.fromEntries(
      Object.entries(datos).filter(([, value]) => value !== undefined),
    );
    Object.assign(existingDoc, definedDatos);
    if (discountStartDate !== undefined) {
      existingDoc.discountStartDate = nextDiscountStart;
    }
    if (discountEndDate !== undefined) {
      existingDoc.discountEndDate = nextDiscountEnd;
    }

    try {
      await existingDoc.save();
    } catch (error) {
      if (this.isSlugDuplicateKeyError(error)) {
        throw new ConflictException(
          `Ya existe un videojuego con el slug "${datos.slug}"`,
        );
      }
      throw error;
    }

    return await this.findOne(id);
  }

  async applyDiscountCampaign(dto: ApplyDiscountCampaignDto) {
    const uniqueIds = [...new Set(dto.gameIds)];
    const existingCount = await this.gameModel
      .countDocuments({ id: { $in: uniqueIds } })
      .exec();

    if (existingCount === 0) {
      throw new NotFoundException(
        'No se encontraron videojuegos para aplicar la campaña.',
      );
    }

    const isClearing = dto.discountPercentage <= 0;
    const campaignName = isClearing
      ? null
      : dto.discountCampaignName?.trim() || 'Campaña de Ofertas';
    const startDate = isClearing
      ? null
      : dto.discountStartDate
        ? new Date(dto.discountStartDate)
        : null;
    const endDate = isClearing
      ? null
      : dto.discountEndDate
        ? new Date(dto.discountEndDate)
        : null;

    if (!isClearing) {
      validateActivationDateRange({
        startDate,
        endDate,
        requireNotBeforeTodayOnStart: startDate !== null,
        requireNotBeforeTodayOnEnd: endDate !== null,
      });
    }

    const nextPercentage = isClearing ? 0 : dto.discountPercentage;

    await this.gameModel
      .updateMany(
        { id: { $in: uniqueIds } },
        {
          $set: {
            discountPercentage: nextPercentage,
            discountCampaignName: campaignName,
            discountStartDate: startDate,
            discountEndDate: endDate,
          },
        },
      )
      .exec();

    const updatedDocs = await this.gameModel
      .find({ id: { $in: uniqueIds } })
      .sort({ id: 1 })
      .lean()
      .exec();
    const hydrated = await this.hydrateGames(
      updatedDocs.map((doc) => this.toPlainGame(doc)),
    );

    return {
      updatedCount: hydrated.length,
      discountPercentage: nextPercentage,
      discountCampaignName: campaignName,
      games: hydrated,
    };
  }

  async remove(id: number): Promise<HydratedGame> {
    const game = await this.findOne(id);
    const backupDoc = await this.gameModel.findOne({ id }).lean().exec();
    let mongoDeleted = false;

    try {
      await this.dataSource.transaction(async (manager) => {
        const editions = await manager.find(GameEdition, {
          where: { gameId: id },
          select: { id: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (editions.length > 0) {
          const editionIds = editions.map((ed) => ed.id);
          const [keysCount, orderItemsCount, librariesCount] =
            await Promise.all([
              manager
                .getRepository(DigitalKey)
                .count({ where: { gameEdition: { id: In(editionIds) } } }),
              manager
                .getRepository(OrderItem)
                .count({ where: { gameEdition: { id: In(editionIds) } } }),
              manager
                .getRepository(UserLibrary)
                .count({ where: { gameEdition: { id: In(editionIds) } } }),
            ]);

          if (keysCount > 0 || orderItemsCount > 0 || librariesCount > 0) {
            throw new ConflictException(
              `No se puede eliminar el videojuego con ID ${id} porque tiene ediciones con claves digitales, órdenes o bibliotecas asociadas`,
            );
          }
        }

        await manager.delete(Wishlist, { gameId: id });
        await manager.delete(Review, { gameId: id });
        await manager.delete(SystemRequirement, { gameId: id });
        await manager.delete(GameEdition, { gameId: id });

        await this.gameModel.deleteOne({ id }).exec();
        mongoDeleted = true;
      });
    } catch (error) {
      if (mongoDeleted && backupDoc) {
        try {
          const cleanBackup = Object.fromEntries(
            Object.entries(this.toPlainGame(backupDoc)).filter(
              ([, value]) => value !== undefined,
            ),
          );
          await this.gameModel
            .updateOne(
              { id },
              { $setOnInsert: cleanBackup },
              { upsert: true, timestamps: false },
            )
            .exec();
        } catch (compensationError) {
          this.logger.error(
            `Error al restaurar el videojuego ${id} en MongoDB tras fallo en MySQL`,
            compensationError,
          );
        }
      }
      throw error;
    }

    return game;
  }
}
