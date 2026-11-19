import * as crypto from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { DigitalKey, KeyStatus } from './entities/digital-key.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { GamesService, type GamePlain } from '../games/games.service.js';
import {
  CreateBulkDigitalKeysDto,
  CreateDigitalKeyDto,
} from './dto/create-digital-key.dto.js';
import { UpdateDigitalKeyDto } from './dto/update-digital-key.dto.js';

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class DigitalKeysService {
  constructor(
    @InjectRepository(DigitalKey)
    private readonly keyRepository: Repository<DigitalKey>,

    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,

    private readonly gamesService: GamesService,
  ) {}

  private generateKeyCode(): string {
    const segment = () =>
      Array.from(
        { length: 4 },
        () => KEY_ALPHABET[crypto.randomInt(0, KEY_ALPHABET.length)],
      ).join('');
    return `${segment()}-${segment()}-${segment()}-${segment()}`;
  }

  private computeCodeHash(code: string): string {
    return crypto.createHash('sha256').update(code.trim()).digest('hex');
  }

  private async hydrateKeys(keys: DigitalKey[]) {
    const gameIds = keys
      .map((k) => k.gameEdition?.gameId)
      .filter((id): id is number => typeof id === 'number');
    const gameMap: Map<number, GamePlain> =
      await this.gamesService.findByIdsMap(gameIds);

    return keys.map((key) => {
      if (!key.gameEdition) {
        return key;
      }
      return {
        ...key,
        gameEdition: {
          ...key.gameEdition,
          game: gameMap.get(key.gameEdition.gameId) ?? null,
        },
      };
    });
  }

  async create(createDto: CreateDigitalKeyDto) {
    const {
      gameEditionId,
      code: rawCode,
      codeHash: rawHash,
      ...datos
    } = createDto;

    const gameEdition = await this.editionRepository.findOneBy({
      id: gameEditionId,
    });
    if (!gameEdition) {
      throw new NotFoundException(
        `La edición de juego con ID ${gameEditionId} no existe`,
      );
    }

    const code = rawCode?.trim() ? rawCode.trim() : this.generateKeyCode();
    const codeHash = rawHash?.trim()
      ? rawHash.trim()
      : this.computeCodeHash(code);

    const existing = await this.keyRepository.findOneBy({ codeHash });
    if (existing) {
      throw new BadRequestException(
        'Ya existe una clave digital registrada con ese código o hash',
      );
    }

    const key = this.keyRepository.create({
      ...datos,
      code,
      codeHash,
      gameEdition,
    });

    return await this.keyRepository.save(key);
  }

  async createBulk(bulkDto: CreateBulkDigitalKeysDto) {
    const gameEdition = await this.editionRepository.findOne({
      where: { id: bulkDto.gameEditionId },
      relations: { platform: true },
    });
    if (!gameEdition) {
      throw new NotFoundException(
        `La edición de juego con ID ${bulkDto.gameEditionId} no existe`,
      );
    }

    let codes: string[] = [];
    if (bulkDto.codes && bulkDto.codes.length > 0) {
      codes = bulkDto.codes.map((c) => c.trim()).filter(Boolean);
      if (codes.length === 0) {
        throw new BadRequestException(
          'Proporciona al menos una clave válida o una cantidad mayor a 0',
        );
      }
      const uniqueInput = new Set(codes);
      if (uniqueInput.size !== codes.length) {
        throw new BadRequestException(
          'La lista contiene códigos duplicados dentro del mismo lote',
        );
      }
    } else if (bulkDto.quantity && bulkDto.quantity > 0) {
      const generated = new Set<string>();
      while (generated.size < bulkDto.quantity) {
        generated.add(this.generateKeyCode());
      }
      codes = Array.from(generated);
    } else {
      throw new BadRequestException(
        'Debes indicar una cantidad o una lista de códigos para generar el lote',
      );
    }

    const hashes = codes.map((c) => this.computeCodeHash(c));
    const collisions = await this.keyRepository.find({
      where: { codeHash: In(hashes) },
    });
    if (collisions.length > 0) {
      if (bulkDto.codes && bulkDto.codes.length > 0) {
        throw new BadRequestException(
          `Se encontraron ${collisions.length} clave(s) ya registradas previamente en el sistema`,
        );
      }
      const collisionHashes = new Set(collisions.map((k) => k.codeHash));
      const uniqueCodes = new Set(codes);
      codes = codes.map((c) => {
        if (!collisionHashes.has(this.computeCodeHash(c))) return c;
        let next = this.generateKeyCode();
        while (
          uniqueCodes.has(next) ||
          collisionHashes.has(this.computeCodeHash(next))
        ) {
          next = this.generateKeyCode();
        }
        uniqueCodes.add(next);
        return next;
      });
    }

    const batchId = bulkDto.batchId?.trim() || `BATCH-${Date.now()}`;
    const entities = codes.map((code) =>
      this.keyRepository.create({
        code,
        codeHash: this.computeCodeHash(code),
        status: KeyStatus.AVAILABLE,
        batchId,
        gameEdition,
      }),
    );

    const keys = await this.keyRepository.save(entities);
    return {
      createdCount: keys.length,
      batchId,
      keys,
    };
  }

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    const keys = await this.keyRepository.find({
      relations: { gameEdition: { platform: true } },
      take,
      skip,
    });
    return await this.hydrateKeys(keys);
  }

  private async findEntityOrFail(id: string): Promise<DigitalKey> {
    const key = await this.keyRepository.findOne({
      where: { id },
      relations: { gameEdition: { platform: true } },
    });
    if (!key) {
      throw new NotFoundException(`Llave digital con ID ${id} no encontrada`);
    }
    return key;
  }

  async findOne(id: string) {
    const key = await this.findEntityOrFail(id);
    const [hydrated] = await this.hydrateKeys([key]);
    return hydrated;
  }

  async update(id: string, updateDto: UpdateDigitalKeyDto) {
    const key = await this.findEntityOrFail(id);
    const { gameEditionId, ...datos } = updateDto;

    if (gameEditionId) {
      const edition = await this.editionRepository.findOne({
        where: { id: gameEditionId },
        relations: { platform: true },
      });
      if (!edition) {
        throw new NotFoundException(
          `La edición con ID ${gameEditionId} no existe`,
        );
      }
      key.gameEdition = edition;
    }

    if (datos.code !== undefined) {
      const trimmedCode = datos.code.trim();
      if (!trimmedCode) {
        delete datos.code;
      } else {
        datos.code = trimmedCode;
        if (!datos.codeHash?.trim() || trimmedCode !== key.code) {
          datos.codeHash = this.computeCodeHash(trimmedCode);
        }
      }
    }
    if (datos.codeHash !== undefined && !datos.codeHash.trim()) {
      delete datos.codeHash;
    }

    this.keyRepository.merge(key, datos);
    const saved = await this.keyRepository.save(key);
    const [hydrated] = await this.hydrateKeys([saved]);
    return hydrated;
  }

  async remove(id: string) {
    const key = await this.findEntityOrFail(id);
    const [hydrated] = await this.hydrateKeys([key]);
    await this.keyRepository.remove(key);
    return hydrated;
  }

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
    const key = await this.findEntityOrFail(keyId);
    key.status = KeyStatus.ASSIGNED;
    return await this.keyRepository.save(key);
  }
}
