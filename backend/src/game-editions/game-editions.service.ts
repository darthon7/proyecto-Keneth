import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameEdition } from './entities/game-edition.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { Platform } from '../platforms/entities/platform.entity.js';
import { CreateGameEditionDto } from './dto/create-game-edition.dto.js';
import { UpdateGameEditionDto } from './dto/update-game-edition.dto.js';

@Injectable()
export class GameEditionsService {
  constructor(
    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,

    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,

    @InjectRepository(Platform)
    private readonly platformRepository: Repository<Platform>,
  ) {}

  async create(createDto: CreateGameEditionDto) {
    const { gameId, platformId, ...datos } = createDto;

    const game = await this.gameRepository.findOneBy({ id: gameId });
    if (!game) {
      throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
    }

    const platform = await this.platformRepository.findOneBy({ id: platformId });
    if (!platform) {
      throw new NotFoundException(`La plataforma con ID ${platformId} no existe`);
    }

    const edition = this.editionRepository.create({
      ...datos,
      game,
      platform,
    });

    return await this.editionRepository.save(edition);
  }

  async findAll() {
    return await this.editionRepository.find({
      relations: {
        game: true,
        platform: true,
      },
    });
  }

  async findOne(id: number) {
    const edition = await this.editionRepository.findOne({
      where: { id },
      relations: {
        game: true,
        platform: true,
        digitalKeys: true,
      },
    });

    if (!edition) {
      throw new NotFoundException(`La edición con ID ${id} no fue encontrada`);
    }

    return edition;
  }

  async update(id: number, updateDto: UpdateGameEditionDto) {
    const edition = await this.findOne(id);
    const { gameId, platformId, ...datos } = updateDto;

    if (gameId) {
      const game = await this.gameRepository.findOneBy({ id: gameId });
      if (!game) {
        throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
      }
      edition.game = game;
    }

    if (platformId) {
      const platform = await this.platformRepository.findOneBy({ id: platformId });
      if (!platform) {
        throw new NotFoundException(`La plataforma con ID ${platformId} no existe`);
      }
      edition.platform = platform;
    }

    this.editionRepository.merge(edition, datos);
    return await this.editionRepository.save(edition);
  }

  async remove(id: number) {
    const edition = await this.findOne(id);
    return await this.editionRepository.remove(edition);
  }

  // Métodos de control de stock físico (idéntico al estilo del proyecto de referencia)
  async descontarStockFisico(id: number, cantidad: number) {
    const edition = await this.findOne(id);

    if (edition.stockPhysical < cantidad) {
      throw new BadRequestException(
        `Stock físico insuficiente para '${edition.editionName}'. Solicitado: ${cantidad}, Disponible: ${edition.stockPhysical}`,
      );
    }

    edition.stockPhysical -= cantidad;
    return await this.editionRepository.save(edition);
  }

  async devolverStockFisico(id: number, cantidad: number) {
    const edition = await this.findOne(id);
    edition.stockPhysical += cantidad;
    return await this.editionRepository.save(edition);
  }
}
