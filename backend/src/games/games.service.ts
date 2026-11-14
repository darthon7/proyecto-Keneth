import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { Game } from './entities/game.entity.js';
import { Publisher } from '../publishers/entities/publisher.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { Genre } from '../genres/entities/genre.entity.js';
import { CreateGameDto } from './dto/create-game.dto.js';
import { UpdateGameDto } from './dto/update-game.dto.js';
import { ApplyDiscountCampaignDto } from './dto/apply-discount-campaign.dto.js';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,

    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,

    @InjectRepository(Developer)
    private readonly developerRepository: Repository<Developer>,

    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async create(createGameDto: CreateGameDto) {
    const {
      publisherId,
      developerId,
      genreIds,
      discountStartDate,
      discountEndDate,
      ...datos
    } = createGameDto;

    const publisher = await this.publisherRepository.findOneBy({ id: publisherId });
    if (!publisher) {
      throw new NotFoundException(`El publisher con ID ${publisherId} no existe`);
    }

    const developer = await this.developerRepository.findOneBy({ id: developerId });
    if (!developer) {
      throw new NotFoundException(`El developer con ID ${developerId} no existe`);
    }

    let genres: Genre[] = [];
    if (genreIds && genreIds.length > 0) {
      genres = await this.genreRepository.find({
        where: { id: In(genreIds) },
      });
    }

    const nuevoJuego = this.gameRepository.create({
      ...datos,
      discountStartDate: discountStartDate ? new Date(discountStartDate) : null,
      discountEndDate: discountEndDate ? new Date(discountEndDate) : null,
      publisher,
      developer,
      genres,
    });

    return await this.gameRepository.save(nuevoJuego);
  }

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    return await this.gameRepository.find({
      relations: {
        publisher: true,
        developer: true,
        genres: true,
        editions: { platform: true, digitalKeys: true },
        systemRequirements: true,
      },
      take,
      skip,
    });
  }

  async findOne(id: number) {
    const game = await this.gameRepository.findOne({
      where: { id },
      relations: {
        publisher: true,
        developer: true,
        genres: true,
        editions: { platform: true, digitalKeys: true },
        systemRequirements: true,
        reviews: true,
      },
    });

    if (!game) {
      throw new NotFoundException(`El videojuego con ID ${id} no fue encontrado`);
    }

    return game;
  }

  async update(id: number, updateGameDto: UpdateGameDto) {
    const game = await this.findOne(id);
    const {
      publisherId,
      developerId,
      genreIds,
      discountStartDate,
      discountEndDate,
      ...datos
    } = updateGameDto;

    if (publisherId) {
      const publisher = await this.publisherRepository.findOneBy({ id: publisherId });
      if (!publisher) {
        throw new NotFoundException(`El publisher con ID ${publisherId} no existe`);
      }
      game.publisher = publisher;
    }

    if (developerId) {
      const developer = await this.developerRepository.findOneBy({ id: developerId });
      if (!developer) {
        throw new NotFoundException(`El developer con ID ${developerId} no existe`);
      }
      game.developer = developer;
    }

    if (genreIds) {
      game.genres = await this.genreRepository.find({
        where: { id: In(genreIds) },
      });
    }

    this.gameRepository.merge(game, {
      ...datos,
      ...(discountStartDate !== undefined
        ? { discountStartDate: discountStartDate ? new Date(discountStartDate) : null }
        : {}),
      ...(discountEndDate !== undefined
        ? { discountEndDate: discountEndDate ? new Date(discountEndDate) : null }
        : {}),
    });
    return await this.gameRepository.save(game);
  }

  async applyDiscountCampaign(dto: ApplyDiscountCampaignDto) {
    const uniqueIds = [...new Set(dto.gameIds)];
    const games = await this.gameRepository.find({
      where: { id: In(uniqueIds) },
    });

    if (games.length === 0) {
      throw new NotFoundException('No se encontraron videojuegos para aplicar la campaña.');
    }

    const isClearing = dto.discountPercentage <= 0;
    const campaignName = isClearing
      ? null
      : (dto.discountCampaignName?.trim() || 'Campaña de Ofertas');
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

    for (const game of games) {
      game.discountPercentage = isClearing ? 0 : dto.discountPercentage;
      game.discountCampaignName = campaignName;
      game.discountStartDate = startDate;
      game.discountEndDate = endDate;
    }

    const updated = await this.gameRepository.save(games);
    return {
      updatedCount: updated.length,
      discountPercentage: isClearing ? 0 : dto.discountPercentage,
      discountCampaignName: campaignName,
      games: updated,
    };
  }

  async remove(id: number) {
    const game = await this.findOne(id);
    return await this.gameRepository.remove(game);
  }
}
