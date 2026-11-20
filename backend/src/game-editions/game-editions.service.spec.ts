import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { GameEditionsService } from './game-editions.service.js';
import type { GameEdition } from './entities/game-edition.entity.js';
import type { Platform } from '../platforms/entities/platform.entity.js';
import type { DigitalKey } from '../digital-keys/entities/digital-key.entity.js';
import type { GamesService } from '../games/games.service.js';

describe('GameEditionsService (sanitización de digitalKeys)', () => {
  let service: GameEditionsService;
  let qbMock: {
    leftJoinAndSelect: ReturnType<typeof vi.fn>;
    leftJoin: ReturnType<typeof vi.fn>;
    addSelect: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    getMany: ReturnType<typeof vi.fn>;
    getOne: ReturnType<typeof vi.fn>;
  };

  const sampleEdition = {
    id: 1,
    gameId: 5,
    editionName: 'Standard Edition',
    basePrice: 59.99,
    platform: { id: 1, name: 'PC', code: 'PC' },
    digitalKeys: [
      {
        id: 'dk-1',
        status: 'AVAILABLE',
        batchId: 'BATCH-1',
        updatedAt: new Date('2025-02-01T00:00:00Z'),
        code: 'AAAA-BBBB-CCCC-DDDD',
        codeHash: 'sha256-secret',
      },
    ],
  };

  beforeEach(() => {
    qbMock = {
      leftJoinAndSelect: vi.fn(() => qbMock),
      leftJoin: vi.fn(() => qbMock),
      addSelect: vi.fn(() => qbMock),
      where: vi.fn(() => qbMock),
      getMany: vi.fn(async () => [sampleEdition]),
      getOne: vi.fn(async () => sampleEdition),
    };

    const mockEditionRepo = {
      createQueryBuilder: vi.fn(() => qbMock),
    } as unknown as Repository<GameEdition>;

    const mockPlatformRepo = {} as Repository<Platform>;
    const mockDigitalKeyRepo = {} as Repository<DigitalKey>;

    const mockGamesService = {
      findByIdsMap: vi.fn(async () => new Map([[5, { id: 5, title: 'Elden Ring' }]])),
      findByIdRaw: vi.fn(async () => ({ id: 5, title: 'Elden Ring' })),
    } as unknown as GamesService;

    service = new GameEditionsService(
      mockEditionRepo,
      mockPlatformRepo,
      mockDigitalKeyRepo,
      mockGamesService,
    );
  });

  it('findAll nunca expone code ni codeHash en digitalKeys', async () => {
    const editions = await service.findAll();
    expect(qbMock.addSelect).toHaveBeenCalledWith([
      'dk.id',
      'dk.status',
      'dk.batchId',
      'dk.updatedAt',
    ]);
    expect(editions).toHaveLength(1);
    expect(editions[0].digitalKeys).toEqual([
      {
        id: 'dk-1',
        status: 'AVAILABLE',
        batchId: 'BATCH-1',
        updatedAt: new Date('2025-02-01T00:00:00Z'),
      },
    ]);
    expect(editions[0].digitalKeys?.[0]).not.toHaveProperty('code');
    expect(editions[0].digitalKeys?.[0]).not.toHaveProperty('codeHash');
  });

  it('findOne nunca expone code ni codeHash en digitalKeys', async () => {
    const edition = await service.findOne(1);
    expect(edition.digitalKeys?.[0]).not.toHaveProperty('code');
    expect(edition.digitalKeys?.[0]).not.toHaveProperty('codeHash');
    expect(edition.game).toEqual({ id: 5, title: 'Elden Ring' });
  });
});
