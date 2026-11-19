import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditionFormat, GameEdition } from './entities/game-edition.entity.js';
import { Platform } from '../platforms/entities/platform.entity.js';
import { DigitalKey, KeyStatus } from '../digital-keys/entities/digital-key.entity.js';
import { GamesService } from '../games/games.service.js';
import { sanitizeDigitalKeys } from '../digital-keys/digital-key.sanitizer.js';
import { CreateGameEditionDto } from './dto/create-game-edition.dto.js';
import { UpdateGameEditionDto } from './dto/update-game-edition.dto.js';
import { ReserveKeysDto, ReleaseKeysDto } from './dto/reserve-keys.dto.js';

@Injectable()
export class GameEditionsService {
  constructor(
    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,

    @InjectRepository(Platform)
    private readonly platformRepository: Repository<Platform>,

    @InjectRepository(DigitalKey)
    private readonly digitalKeyRepository: Repository<DigitalKey>,

    private readonly gamesService: GamesService,
  ) {}

  private sanitizeEdition(edition: GameEdition) {
    return {
      ...edition,
      digitalKeys: sanitizeDigitalKeys(edition.digitalKeys),
    };
  }

  private async findEditionWithSanitizedKeys(
    id: number,
  ): Promise<GameEdition | null> {
    return await this.editionRepository
      .createQueryBuilder('edition')
      .leftJoinAndSelect('edition.platform', 'platform')
      .leftJoin('edition.digitalKeys', 'dk')
      .addSelect(['dk.id', 'dk.status', 'dk.batchId', 'dk.updatedAt'])
      .where('edition.id = :id', { id })
      .getOne();
  }

  async create(createDto: CreateGameEditionDto) {
    const { gameId, platformId, ...datos } = createDto;

    const game = await this.gamesService.findByIdRaw(gameId);
    if (!game) {
      throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
    }

    const platform = await this.platformRepository.findOneBy({ id: platformId });
    if (!platform) {
      throw new NotFoundException(
        `La plataforma con ID ${platformId} no existe`,
      );
    }

    const edition = this.editionRepository.create({
      ...datos,
      format: datos.format ?? EditionFormat.DIGITAL,
      gameId: game.id,
      platform,
    });

    const saved = await this.editionRepository.save(edition);
    return {
      ...saved,
      game,
    };
  }

  async findAll() {
    const editions = await this.editionRepository
      .createQueryBuilder('edition')
      .leftJoinAndSelect('edition.platform', 'platform')
      .leftJoin('edition.digitalKeys', 'dk')
      .addSelect(['dk.id', 'dk.status', 'dk.batchId', 'dk.updatedAt'])
      .getMany();

    const gameMap = await this.gamesService.findByIdsMap(
      editions.map((e) => e.gameId),
    );
    return editions.map((edition) => ({
      ...this.sanitizeEdition(edition),
      game: gameMap.get(edition.gameId) ?? null,
    }));
  }

  async findOne(id: number) {
    const edition = await this.findEditionWithSanitizedKeys(id);

    if (!edition) {
      throw new NotFoundException(`La edición con ID ${id} no fue encontrada`);
    }

    const game = await this.gamesService.findByIdRaw(edition.gameId);
    return {
      ...this.sanitizeEdition(edition),
      game,
    };
  }

  async update(id: number, updateDto: UpdateGameEditionDto) {
    const edition = await this.editionRepository.findOne({
      where: { id },
      relations: { platform: true },
    });
    if (!edition) {
      throw new NotFoundException(`La edición con ID ${id} no fue encontrada`);
    }

    const { gameId, platformId, ...datos } = updateDto;

    if (gameId) {
      const game = await this.gamesService.findByIdRaw(gameId);
      if (!game) {
        throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
      }
      edition.gameId = game.id;
    }

    if (platformId) {
      const platform = await this.platformRepository.findOneBy({
        id: platformId,
      });
      if (!platform) {
        throw new NotFoundException(
          `La plataforma con ID ${platformId} no existe`,
        );
      }
      edition.platform = platform;
    }

    this.editionRepository.merge(edition, datos);
    await this.editionRepository.save(edition);
    return await this.findOne(id);
  }

  async remove(id: number) {
    const edition = await this.editionRepository.findOne({
      where: { id },
      relations: { platform: true },
    });
    if (!edition) {
      throw new NotFoundException(`La edición con ID ${id} no fue encontrada`);
    }
    const sanitized = await this.findOne(id);
    await this.editionRepository.remove(edition);
    return sanitized;
  }

  async reserveKeys(editionId: number, dto: ReserveKeysDto) {
    const edition = await this.editionRepository.findOne({
      where: { id: editionId },
    });
    if (!edition) {
      throw new NotFoundException(`La edición con ID ${editionId} no existe`);
    }

    const availableKeys = await this.digitalKeyRepository.find({
      where: {
        gameEdition: { id: editionId },
        status: KeyStatus.AVAILABLE,
      },
      take: dto.quantity,
    });

    if (availableKeys.length < dto.quantity) {
      throw new BadRequestException(
        `No hay suficiente stock disponible. Solicitadas: ${dto.quantity}, disponibles: ${availableKeys.length}`,
      );
    }

    for (const key of availableKeys) {
      key.status = KeyStatus.RESERVED;
    }
    await this.digitalKeyRepository.save(availableKeys);

    return {
      success: true,
      editionId,
      reservedCount: availableKeys.length,
      message: `${availableKeys.length} clave(s) reservada(s) temporalmente en el carrito`,
    };
  }

  async releaseKeys(editionId: number, dto: ReleaseKeysDto) {
    const edition = await this.editionRepository.findOne({
      where: { id: editionId },
    });
    if (!edition) {
      throw new NotFoundException(`La edición con ID ${editionId} no existe`);
    }

    const reservedKeys = await this.digitalKeyRepository.find({
      where: {
        gameEdition: { id: editionId },
        status: KeyStatus.RESERVED,
      },
      take: dto.quantity,
    });

    if (reservedKeys.length > 0) {
      for (const key of reservedKeys) {
        key.status = KeyStatus.AVAILABLE;
      }
      await this.digitalKeyRepository.save(reservedKeys);
    }

    return {
      success: true,
      editionId,
      releasedCount: reservedKeys.length,
      message: `${reservedKeys.length} clave(s) liberada(s) al stock disponible`,
    };
  }
}
