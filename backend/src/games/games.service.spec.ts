import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { DataSource, Repository } from 'typeorm';
import { GamesService } from './games.service.js';
import type { GameDocument } from './schemas/game.schema.js';
import type { CounterDocument } from './schemas/counter.schema.js';
import type { Publisher } from '../publishers/entities/publisher.entity.js';
import type { Developer } from '../developers/entities/developer.entity.js';
import type { Genre } from '../genres/entities/genre.entity.js';
import type { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import type { SystemRequirement } from '../system-requirements/entities/system-requirement.entity.js';
import type { Review } from '../reviews/entities/review.entity.js';

function createChainableQuery<T>(result: T) {
  const query = {
    sort: vi.fn(() => query),
    skip: vi.fn(() => query),
    limit: vi.fn(() => query),
    lean: vi.fn(() => query),
    exec: vi.fn(async () => result),
  };
  return query;
}

describe('GamesService (MongoDB + hidratación MySQL)', () => {
  let service: GamesService;
  let storedGames: Array<Record<string, unknown>>;
  let counterSeq: number;
  let hasCounter: boolean;
  let editionRowsFromQb: Array<Record<string, unknown>>;

  let mockGameModel: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteOne: ReturnType<typeof vi.fn>;
  };
  let mockCounterModel: {
    findById: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
  };
  let mockPublisherRepo: {
    findOneBy: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };
  let mockDeveloperRepo: {
    findOneBy: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };
  let mockGenreRepo: { find: ReturnType<typeof vi.fn> };
  let mockEditionRepo: {
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let mockRequirementRepo: { find: ReturnType<typeof vi.fn> };
  let mockReviewRepo: { find: ReturnType<typeof vi.fn> };
  let mockDataSource: {
    transaction: ReturnType<typeof vi.fn>;
  };
  let digitalKeyCount: number;
  let txEditions: Array<{ id: number }>;
  let qbMock: {
    leftJoinAndSelect: ReturnType<typeof vi.fn>;
    leftJoin: ReturnType<typeof vi.fn>;
    addSelect: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    getMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storedGames = [];
    counterSeq = 0;
    hasCounter = false;
    digitalKeyCount = 0;
    txEditions = [];
    editionRowsFromQb = [];

    mockGameModel = {
      findOne: vi.fn((filter?: Record<string, unknown>) => {
        if (!filter || Object.keys(filter).length === 0) {
          const sorted = [...storedGames].sort(
            (a, b) => Number(b.id) - Number(a.id),
          );
          return createChainableQuery(sorted[0] ?? null);
        }
        const match =
          storedGames.find((g) => {
            if (filter.slug !== undefined && g.slug !== filter.slug) return false;
            if (filter.id !== undefined && g.id !== filter.id) return false;
            return true;
          }) ?? null;
        return createChainableQuery(
          match ? { ...match, save: vi.fn(async () => match) } : null,
        );
      }),
      find: vi.fn((filter?: Record<string, unknown>) => {
        const idFilter = filter?.id as { $in?: number[] } | undefined;
        const result = idFilter?.$in
          ? storedGames.filter((g) => idFilter.$in!.includes(Number(g.id)))
          : [...storedGames];
        return createChainableQuery(result);
      }),
      create: vi.fn(async (data: Record<string, unknown>) => {
        const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
        storedGames.push(doc);
        return { toObject: () => ({ ...doc }) };
      }),
      updateOne: vi.fn(
        (
          filter: { id: number },
          update: { $setOnInsert?: Record<string, unknown> },
          options?: { upsert?: boolean },
        ) => ({
          exec: vi.fn(async () => {
            const exists = storedGames.some((g) => g.id === filter.id);
            if (!exists && options?.upsert && update.$setOnInsert) {
              storedGames.push({ ...update.$setOnInsert });
            }
            return { acknowledged: true };
          }),
        }),
      ),
      countDocuments: vi.fn((filter?: Record<string, unknown>) => {
        const idFilter = filter?.id as { $in?: number[] } | undefined;
        const count = idFilter?.$in
          ? storedGames.filter((g) => idFilter.$in!.includes(Number(g.id))).length
          : storedGames.length;
        return { exec: vi.fn(async () => count) };
      }),
      updateMany: vi.fn(
        (
          filter: { id?: { $in?: number[] } },
          update: { $set?: Record<string, unknown> },
        ) => ({
          exec: vi.fn(async () => {
            for (const g of storedGames) {
              if (!filter.id?.$in || filter.id.$in.includes(Number(g.id))) {
                Object.assign(g, update.$set);
              }
            }
            return { modifiedCount: storedGames.length };
          }),
        }),
      ),
      deleteOne: vi.fn((filter: { id: number }) => ({
        exec: vi.fn(async () => {
          storedGames = storedGames.filter((g) => g.id !== filter.id);
          return { deletedCount: 1 };
        }),
      })),
    };

    mockCounterModel = {
      findById: vi.fn(() =>
        createChainableQuery(
          hasCounter ? { _id: 'games', seq: counterSeq } : null,
        ),
      ),
      updateOne: vi.fn(
        async (
          _filter: unknown,
          update: { $setOnInsert?: { seq: number } },
        ) => {
          if (!hasCounter) {
            hasCounter = true;
            counterSeq = update.$setOnInsert?.seq ?? 0;
          }
          return { acknowledged: true };
        },
      ),
      findOneAndUpdate: vi.fn(() => {
        hasCounter = true;
        counterSeq += 1;
        return createChainableQuery({ _id: 'games', seq: counterSeq });
      }),
    };

    mockPublisherRepo = {
      findOneBy: vi.fn(async ({ id }: { id: number }) =>
        id === 1 ? ({ id: 1, name: 'Nintendo' } as Publisher) : null,
      ),
      find: vi.fn(async () => [{ id: 1, name: 'Nintendo' } as Publisher]),
    };

    mockDeveloperRepo = {
      findOneBy: vi.fn(async ({ id }: { id: number }) =>
        id === 1 ? ({ id: 1, name: 'Nintendo EPD' } as Developer) : null,
      ),
      find: vi.fn(async () => [{ id: 1, name: 'Nintendo EPD' } as Developer]),
    };

    mockGenreRepo = {
      find: vi.fn(async () => [
        { id: 2, name: 'Aventura', slug: 'aventura' } as Genre,
      ]),
    };

    qbMock = {
      leftJoinAndSelect: vi.fn(() => qbMock),
      leftJoin: vi.fn(() => qbMock),
      addSelect: vi.fn(() => qbMock),
      where: vi.fn(() => qbMock),
      getMany: vi.fn(async () => editionRowsFromQb),
    };

    mockEditionRepo = {
      createQueryBuilder: vi.fn(() => qbMock),
    };
    mockRequirementRepo = { find: vi.fn(async () => []) };
    mockReviewRepo = { find: vi.fn(async () => []) };

    mockDataSource = {
      transaction: vi.fn(
        async <T>(
          cb: (manager: {
            find: ReturnType<typeof vi.fn>;
            getRepository: ReturnType<typeof vi.fn>;
            delete: ReturnType<typeof vi.fn>;
          }) => Promise<T>,
        ) =>
          cb({
            find: vi.fn(async () => txEditions),
            getRepository: vi.fn(() => ({
              count: vi.fn(async () => digitalKeyCount),
            })),
            delete: vi.fn(async () => ({ affected: 0 })),
          }),
      ),
    };

    service = new GamesService(
      mockGameModel as unknown as Model<GameDocument>,
      mockCounterModel as unknown as Model<CounterDocument>,
      mockPublisherRepo as unknown as Repository<Publisher>,
      mockDeveloperRepo as unknown as Repository<Developer>,
      mockGenreRepo as unknown as Repository<Genre>,
      mockEditionRepo as unknown as Repository<GameEdition>,
      mockRequirementRepo as unknown as Repository<SystemRequirement>,
      mockReviewRepo as unknown as Repository<Review>,
      mockDataSource as unknown as DataSource,
    );
  });

  it('crea un juego con id autoincremental desde counters y relaciones hidratadas', async () => {
    const created = await service.create({
      title: 'Metroid Prime 4',
      slug: 'metroid-prime-4',
      releaseDate: '2025-11-15',
      publisherId: 1,
      developerId: 1,
      genreIds: [2],
    });

    expect(created.id).toBe(1);
    expect(created.publisher?.name).toBe('Nintendo');
    expect(created.developer?.name).toBe('Nintendo EPD');
    expect(created.genres).toHaveLength(1);
    expect(created.genreIds).toEqual([2]);
  });

  it('rechaza creación si alguno de los genreIds no existe en MySQL', async () => {
    mockGenreRepo.find.mockResolvedValue([
      { id: 2, name: 'Aventura', slug: 'aventura' } as Genre,
    ]);

    await expect(
      service.create({
        title: 'Metroid Prime 4',
        slug: 'metroid-prime-4',
        releaseDate: '2025-11-15',
        publisherId: 1,
        developerId: 1,
        genreIds: [2, 999],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza creación si el slug ya existe en MongoDB', async () => {
    await service.create({
      title: 'Metroid Prime 4',
      slug: 'metroid-prime-4',
      releaseDate: '2025-11-15',
      publisherId: 1,
      developerId: 1,
    });

    await expect(
      service.create({
        title: 'Metroid Prime 4 Duplicate',
        slug: 'metroid-prime-4',
        releaseDate: '2025-11-15',
        publisherId: 1,
        developerId: 1,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('no enmascara errores 11000 ajenos a slug como conflicto de slug', async () => {
    mockGameModel.create.mockRejectedValueOnce({
      code: 11000,
      keyPattern: { id: 1 },
      keyValue: { id: 1 },
    });

    await expect(
      service.create({
        title: 'Collision Game',
        slug: 'collision-game',
        releaseDate: '2025-11-15',
        publisherId: 1,
        developerId: 1,
      }),
    ).rejects.not.toThrow(ConflictException);
  });

  it('rechaza creación si publisherId no existe en MySQL', async () => {
    await expect(
      service.create({
        title: 'Unknown Pub Game',
        slug: 'unknown-pub-game',
        releaseDate: '2025-11-15',
        publisherId: 999,
        developerId: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('findAll y findOne nunca exponen code ni codeHash en digitalKeys', async () => {
    await service.create({
      title: 'Hades',
      slug: 'hades',
      releaseDate: '2020-09-17',
      publisherId: 1,
      developerId: 1,
    });

    editionRowsFromQb = [
      {
        id: 10,
        gameId: 1,
        editionName: 'Standard Edition',
        basePrice: 24.99,
        digitalKeys: [
          {
            id: 'key-uuid-1',
            status: 'AVAILABLE',
            batchId: 'SEED-PC',
            updatedAt: new Date('2025-01-01T00:00:00Z'),
            code: 'SECRET-CODE-1234',
            codeHash: 'secret-sha256-hash',
          },
        ],
      },
    ];

    const list = await service.findAll();
    expect(qbMock.addSelect).toHaveBeenCalledWith([
      'dk.id',
      'dk.status',
      'dk.batchId',
      'dk.updatedAt',
    ]);
    expect(list[0].editions?.[0].digitalKeys).toHaveLength(1);
    expect(list[0].editions?.[0].digitalKeys?.[0]).toEqual({
      id: 'key-uuid-1',
      status: 'AVAILABLE',
      batchId: 'SEED-PC',
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    expect(list[0].editions?.[0].digitalKeys?.[0]).not.toHaveProperty('code');
    expect(list[0].editions?.[0].digitalKeys?.[0]).not.toHaveProperty(
      'codeHash',
    );

    const detail = await service.findOne(1);
    expect(detail.editions?.[0].digitalKeys?.[0]).not.toHaveProperty('code');
    expect(detail.editions?.[0].digitalKeys?.[0]).not.toHaveProperty(
      'codeHash',
    );
  });

  it('findByIdsMap devuelve un Map indexado por id en una sola consulta', async () => {
    await service.create({
      title: 'Game One',
      slug: 'game-one',
      releaseDate: '2024-01-01',
      publisherId: 1,
      developerId: 1,
    });
    await service.create({
      title: 'Game Two',
      slug: 'game-two',
      releaseDate: '2024-02-01',
      publisherId: 1,
      developerId: 1,
    });

    const map = await service.findByIdsMap([1, 2]);
    expect(map.size).toBe(2);
    expect(map.get(1)?.title).toBe('Game One');
    expect(map.get(2)?.title).toBe('Game Two');
  });

  it('remove bloquea eliminación si existen ediciones con claves digitales, órdenes o bibliotecas asociadas', async () => {
    await service.create({
      title: 'Protected Game',
      slug: 'protected-game',
      releaseDate: '2024-05-01',
      publisherId: 1,
      developerId: 1,
    });

    txEditions = [{ id: 10 }];
    digitalKeyCount = 3;

    await expect(service.remove(1)).rejects.toThrow(ConflictException);
    expect(mockGameModel.deleteOne).not.toHaveBeenCalled();
  });

  it('remove restaura el documento en MongoDB si el commit de la transacción MySQL falla después del deleteOne', async () => {
    await service.create({
      title: 'Rollback Game',
      slug: 'rollback-game',
      releaseDate: '2024-05-01',
      publisherId: 1,
      developerId: 1,
    });

    mockDataSource.transaction.mockImplementationOnce(
      async (
        cb: (manager: {
          find: ReturnType<typeof vi.fn>;
          getRepository: ReturnType<typeof vi.fn>;
          delete: ReturnType<typeof vi.fn>;
        }) => Promise<unknown>,
      ) => {
        await cb({
          find: vi.fn(async () => []),
          getRepository: vi.fn(() => ({ count: vi.fn(async () => 0) })),
          delete: vi.fn(async () => ({ affected: 0 })),
        });
        throw new Error('MySQL commit failed');
      },
    );

    await expect(service.remove(1)).rejects.toThrow('MySQL commit failed');
    expect(mockGameModel.deleteOne).toHaveBeenCalledWith({ id: 1 });
    expect(mockGameModel.updateOne).toHaveBeenCalledWith(
      { id: 1 },
      { $setOnInsert: expect.objectContaining({ id: 1, slug: 'rollback-game' }) },
      { upsert: true, timestamps: false },
    );
    expect(storedGames.some((g) => g.id === 1)).toBe(true);
  });

  it('remove re-lanza el error original de MySQL aunque falle la compensación en MongoDB', async () => {
    await service.create({
      title: 'Rollback Fail Game',
      slug: 'rollback-fail-game',
      releaseDate: '2024-05-01',
      publisherId: 1,
      developerId: 1,
    });

    mockDataSource.transaction.mockImplementationOnce(
      async (
        cb: (manager: {
          find: ReturnType<typeof vi.fn>;
          getRepository: ReturnType<typeof vi.fn>;
          delete: ReturnType<typeof vi.fn>;
        }) => Promise<unknown>,
      ) => {
        await cb({
          find: vi.fn(async () => []),
          getRepository: vi.fn(() => ({ count: vi.fn(async () => 0) })),
          delete: vi.fn(async () => ({ affected: 0 })),
        });
        throw new Error('Original MySQL error');
      },
    );

    mockGameModel.updateOne.mockReturnValueOnce({
      exec: vi.fn(async () => {
        throw new Error('Mongo compensation error');
      }),
    });

    await expect(service.remove(1)).rejects.toThrow('Original MySQL error');
  });
});
