import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { DigitalKey, KeyStatus } from './entities/digital-key.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { CreateDigitalKeyDto } from './dto/create-digital-key.dto.js';
import { UpdateDigitalKeyDto } from './dto/update-digital-key.dto.js';

@Injectable()
export class DigitalKeysService {
  constructor(
    @InjectRepository(DigitalKey)
    private readonly keyRepository: Repository<DigitalKey>,

    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,
  ) {}

  async create(createDto: CreateDigitalKeyDto) {
    const { gameEditionId, ...datos } = createDto;

    const gameEdition = await this.editionRepository.findOneBy({
      id: gameEditionId,
    });
    if (!gameEdition) {
      throw new NotFoundException(
        `La edición de juego con ID ${gameEditionId} no existe`,
      );
    }

    const key = this.keyRepository.create({
      ...datos,
      gameEdition,
    });

    return await this.keyRepository.save(key);
  }

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    return await this.keyRepository.find({
      relations: { gameEdition: true },
      take,
      skip,
    });
  }

  async findOne(id: string) {
    const key = await this.keyRepository.findOne({
      where: { id },
      relations: { gameEdition: true },
    });
    if (!key) {
      throw new NotFoundException(`Llave digital con ID ${id} no encontrada`);
    }
    return key;
  }

  async update(id: string, updateDto: UpdateDigitalKeyDto) {
    const key = await this.findOne(id);
    const { gameEditionId, ...datos } = updateDto;

    if (gameEditionId) {
      const edition = await this.editionRepository.findOneBy({
        id: gameEditionId,
      });
      if (!edition) {
        throw new NotFoundException(
          `La edición con ID ${gameEditionId} no existe`,
        );
      }
      key.gameEdition = edition;
    }

    this.keyRepository.merge(key, datos);
    return await this.keyRepository.save(key);
  }

  async remove(id: string) {
    const key = await this.findOne(id);
    return await this.keyRepository.remove(key);
  }

  // Método de negocio para obtener una llave disponible para venta
  async obtenerLlaveDisponible(gameEditionId: number) {
    const key = await this.keyRepository.findOne({
      where: {
        gameEdition: { id: gameEditionId },
        status: KeyStatus.AVAILABLE,
      },
    });

    if (!key) {
      throw new BadRequestException(
        `No hay llaves digitales disponibles para la edición ${gameEditionId}`,
      );
    }

    return key;
  }

  async marcarComoAsignada(keyId: string) {
    const key = await this.findOne(keyId);
    key.status = KeyStatus.ASSIGNED;
    return await this.keyRepository.save(key);
  }
}
