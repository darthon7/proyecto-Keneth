import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DataSource, EntityTarget } from 'typeorm';
import { executeSeed, runSeed, type MongoSeedModels } from './seed.js';
import { isScryptHash, verifyPassword } from '../auth/password.util.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { Platform } from '../platforms/entities/platform.entity.js';
import { Genre } from '../genres/entities/genre.entity.js';
import { Publisher } from '../publishers/entities/publisher.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { DigitalKey } from '../digital-keys/entities/digital-key.entity.js';
import { SystemRequirement } from '../system-requirements/entities/system-requirement.entity.js';
import { Promotion } from '../promotions/entities/promotion.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { FeaturedTrailer } from '../featured-trailers/entities/featured-trailer.entity.js';

describe('Database Seeder Verification', () => {
  const seedFilePath = path.resolve(__dirname, 'seed.ts');
  const seedContent = fs.readFileSync(seedFilePath, 'utf-8');

  it('el archivo seed.ts existe y está correctamente estructurado', () => {
    expect(fs.existsSync(seedFilePath)).toBe(true);
    expect(seedContent).toContain('import { DigitalKey');
    expect(seedContent).toContain('runSeed()');
  });

  it('contiene al menos 10 juegos de Nintendo Switch', () => {
    const nswMatches = seedContent.match(/platformCode:\s*'NSW'/g);
    expect(nswMatches).not.toBeNull();
    expect(nswMatches!.length).toBeGreaterThanOrEqual(10);
  });

  it('contiene al menos 5 juegos de PlayStation 5', () => {
    const ps5Matches = seedContent.match(/platformCode:\s*'PS5'/g);
    expect(ps5Matches).not.toBeNull();
    expect(ps5Matches!.length).toBeGreaterThanOrEqual(5);
  });

  it('contiene al menos 5 juegos de Xbox Series X|S', () => {
    const xsxMatches = seedContent.match(/platformCode:\s*'XSX'/g);
    expect(xsxMatches).not.toBeNull();
    expect(xsxMatches!.length).toBeGreaterThanOrEqual(5);
  });

  it('contiene al menos 10 juegos de PC con requisitos de sistema', () => {
    const pcMatches = seedContent.match(/platformCode:\s*'PC'/g);
    expect(pcMatches).not.toBeNull();
    expect(pcMatches!.length).toBeGreaterThanOrEqual(10);
    expect(seedContent).toContain('sysReq:');
  });

  it('todas las imágenes de juegos usan URLs externas HTTPS y las de plataformas, desarrolladoras y trailers apuntan a activos locales existentes', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    const gameUrls = seedContent.match(/coverImageUrl:\s*'([^']+)'/g) ?? [];
    expect(gameUrls.length).toBeGreaterThanOrEqual(30);

    for (const match of gameUrls) {
      const url = match.replace(/^[a-zA-Z]+:\s*'/, '').replace(/'$/, '');
      expect(url).toMatch(/^https:\/\/[^\s]+$/);
    }

    const localUrlMatches = [
      ...(seedContent.match(/coverImagenUrl:\s*'([^']+)'/g) ?? []),
      ...(seedContent.match(/iconUrl:\s*'([^']+)'/g) ?? []),
      ...(seedContent.match(/imageUrl:\s*'([^']+)'/g) ?? []),
    ];
    expect(localUrlMatches.length).toBeGreaterThanOrEqual(30);

    for (const match of localUrlMatches) {
      const url = match.replace(/^[a-zA-Z]+:\s*'/, '').replace(/'$/, '');
      expect(url.startsWith('/media/')).toBe(true);
      const filePath = path.join(publicDir, url.replace(/^\//, ''));
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.statSync(filePath).size).toBeGreaterThan(0);
    }
  });

  it('genera claves digitales únicas con hash criptográfico SHA-256', () => {
    expect(seedContent).toContain('crypto.createHash(\'sha256\')');
    expect(seedContent).toContain('KeyStatus.AVAILABLE');
  });

  it('siembra de forma idempotente usuarios ADMIN y CUSTOMER con soporte de variables de entorno y protección en producción', () => {
    expect(seedContent).toContain('UserRole.ADMIN');
    expect(seedContent).toContain('UserRole.CUSTOMER');
    expect(seedContent).toContain('SEED_ADMIN_EMAIL');
    expect(seedContent).toContain('SEED_ADMIN_PASSWORD');
    expect(seedContent).toContain('SEED_ADMIN_USERNAME');
    expect(seedContent).toContain("NODE_ENV === 'production'");
    expect(seedContent).not.toContain('existingUser.isActive = true');
  });
});

interface MockRecord {
  id: number | string;
  [key: string]: unknown;
}

function matchesSingleWhere(
  record: MockRecord,
  where: Record<string, unknown>,
): boolean {
  for (const [key, expected] of Object.entries(where)) {
    const actual = record[key];
    if (
      expected !== null &&
      typeof expected === 'object' &&
      !Array.isArray(expected) &&
      'id' in expected
    ) {
      const actualObj = actual as { id?: unknown } | undefined;
      if (!actualObj || actualObj.id !== (expected as { id: unknown }).id) {
        return false;
      }
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function matchesWhere(
  record: MockRecord,
  where: Record<string, unknown> | Array<Record<string, unknown>> | undefined,
): boolean {
  if (!where) {
    return true;
  }
  if (Array.isArray(where)) {
    return where.some((clause) => matchesSingleWhere(record, clause));
  }
  return matchesSingleWhere(record, where);
}

function createInMemoryRepo<T extends MockRecord>(uniqueFields: string[] = []) {
  const items: T[] = [];
  let nextId = 1;

  const repo = {
    items,
    findOne: vi.fn(
      async (options?: {
        where?: Record<string, unknown> | Array<Record<string, unknown>>;
      }): Promise<T | null> => {
        const found = items.find((item) => matchesWhere(item, options?.where));
        return found ?? null;
      },
    ),
    find: vi.fn(
      async (options?: {
        where?: Record<string, unknown> | Array<Record<string, unknown>>;
      }): Promise<T[]> => {
        return items.filter((item) => matchesWhere(item, options?.where));
      },
    ),
    create: vi.fn((data: Partial<T>): T => ({ ...data }) as T),
    save: vi.fn(async (entityOrEntities: T | T[]): Promise<T | T[]> => {
      const saveSingle = (entity: T): T => {
        for (const field of uniqueFields) {
          const val = entity[field];
          if (val === undefined || val === null) continue;
          const collision = items.find(
            (other) => other.id !== entity.id && other[field] === val,
          );
          if (collision) {
            throw new Error(`UNIQUE constraint failed on field "${field}": ${String(val)}`);
          }
        }
        if (!entity.id) {
          entity.id = nextId++;
          items.push(entity);
        } else {
          const idx = items.findIndex((item) => item.id === entity.id);
          if (idx >= 0) {
            items[idx] = entity;
          } else {
            items.push(entity);
          }
        }
        return entity;
      };

      if (Array.isArray(entityOrEntities)) {
        return entityOrEntities.map(saveSingle);
      }
      return saveSingle(entityOrEntities);
    }),
  };

  return repo;
}

interface MockMongoGame extends MockRecord {
  id: number;
  title: string;
  slug: string;
  publisherId: number;
  developerId: number;
  genreIds: number[];
  discountPercentage?: number;
  discountCampaignName?: string | null;
}

function createInMemoryMongoModels() {
  const games: MockMongoGame[] = [];
  const counters = new Map<string, { _id: string; seq: number }>();

  const gameModel = {
    items: games,
    findOne: vi.fn(
      async (
        filter?: Record<string, unknown>,
        _projection?: unknown,
        options?: { sort?: { id?: number } },
      ): Promise<MockMongoGame | null> => {
        if (options?.sort?.id === -1 && (!filter || Object.keys(filter).length === 0)) {
          const sorted = [...games].sort((a, b) => b.id - a.id);
          return sorted[0] ?? null;
        }
        return (
          games.find((g) =>
            Object.entries(filter ?? {}).every(([k, v]) => g[k] === v),
          ) ?? null
        );
      },
    ),
    create: vi.fn(async (data: MockMongoGame): Promise<MockMongoGame> => {
      if (games.some((g) => g.slug === data.slug)) {
        throw new Error(`Duplicate slug: ${data.slug}`);
      }
      const created = { ...data };
      games.push(created);
      return created;
    }),
    updateOne: vi.fn(
      async (
        filter: Record<string, unknown>,
        update: { $set?: Record<string, unknown> },
      ) => {
        const target = games.find((g) =>
          Object.entries(filter).every(([k, v]) => g[k] === v),
        );
        if (target && update.$set) {
          Object.assign(target, update.$set);
        }
        return { matchedCount: target ? 1 : 0, modifiedCount: target ? 1 : 0 };
      },
    ),
    deleteMany: vi.fn(async (filter?: { id?: { $in?: number[] } }) => {
      if (filter?.id?.$in) {
        const idsToDelete = new Set(filter.id.$in);
        const before = games.length;
        for (let i = games.length - 1; i >= 0; i--) {
          if (idsToDelete.has(games[i].id)) {
            games.splice(i, 1);
          }
        }
        return { deletedCount: before - games.length };
      }
      const deletedCount = games.length;
      games.length = 0;
      return { deletedCount };
    }),
  };

  const counterModel = {
    items: counters,
    findById: vi.fn(async (id: string) => counters.get(id) ?? null),
    updateOne: vi.fn(
      async (
        filter: { _id: string },
        update: { $setOnInsert?: { seq: number }; $set?: { seq: number } },
        options?: { upsert?: boolean },
      ) => {
        if (update.$set && counters.has(filter._id)) {
          counters.set(filter._id, {
            _id: filter._id,
            seq: update.$set.seq,
          });
        } else if (!counters.has(filter._id) && options?.upsert) {
          counters.set(filter._id, {
            _id: filter._id,
            seq: update.$setOnInsert?.seq ?? 0,
          });
        }
        return { acknowledged: true };
      },
    ),
    findOneAndUpdate: vi.fn(
      async (
        filter: { _id: string },
        update: { $inc?: { seq: number } },
        options?: { upsert?: boolean },
      ) => {
        let current = counters.get(filter._id);
        if (!current && options?.upsert) {
          current = { _id: filter._id, seq: 0 };
          counters.set(filter._id, current);
        }
        if (current && update.$inc?.seq) {
          current.seq += update.$inc.seq;
        }
        return current ? { ...current } : null;
      },
    ),
    deleteMany: vi.fn(async (filter?: { _id?: string }) => {
      if (filter?._id) {
        counters.delete(filter._id);
      } else {
        counters.clear();
      }
      return { acknowledged: true };
    }),
  };

  const mongoModels = {
    gameModel,
    counterModel,
  } as unknown as MongoSeedModels;

  return { mongoModels, gameModel, counterModel };
}

function createMockSeedDataSource() {
  const userRepo = createInMemoryRepo<User & MockRecord>(['email', 'username']);
  const platformRepo = createInMemoryRepo<Platform & MockRecord>(['code']);
  const genreRepo = createInMemoryRepo<Genre & MockRecord>(['slug']);
  const publisherRepo = createInMemoryRepo<Publisher & MockRecord>(['name']);
  const developerRepo = createInMemoryRepo<Developer & MockRecord>(['name']);
  const editionRepo = createInMemoryRepo<GameEdition & MockRecord>();
  const keyRepo = createInMemoryRepo<DigitalKey & MockRecord>(['codeHash']);
  const sysReqRepo = createInMemoryRepo<SystemRequirement & MockRecord>();
  const promotionRepo = createInMemoryRepo<Promotion & MockRecord>();
  const reviewRepo = createInMemoryRepo<Review & MockRecord>();
  const trailerRepo = createInMemoryRepo<FeaturedTrailer & MockRecord>(['slot']);
  const { mongoModels, gameModel: gameRepo, counterModel } =
    createInMemoryMongoModels();

  const repoMap = new Map<EntityTarget<unknown>, unknown>([
    [User, userRepo],
    [Platform, platformRepo],
    [Genre, genreRepo],
    [Publisher, publisherRepo],
    [Developer, developerRepo],
    [GameEdition, editionRepo],
    [DigitalKey, keyRepo],
    [SystemRequirement, sysReqRepo],
    [Promotion, promotionRepo],
    [Review, reviewRepo],
    [FeaturedTrailer, trailerRepo],
  ]);

  const getRepository = vi.fn((entity: EntityTarget<unknown>) => {
    const repo = repoMap.get(entity);
    if (!repo) {
      throw new Error(`Repositorio no mockeado para entidad: ${String(entity)}`);
    }
    return repo;
  });

  const dataSource = {
    getRepository,
    transaction: vi.fn(
      async <T>(cb: (manager: { getRepository: typeof getRepository }) => Promise<T>) =>
        cb({ getRepository }),
    ),
  } as unknown as DataSource;

  return {
    dataSource,
    mongoModels,
    userRepo,
    platformRepo,
    genreRepo,
    publisherRepo,
    developerRepo,
    gameRepo,
    counterModel,
    editionRepo,
    keyRepo,
    sysReqRepo,
    promotionRepo,
    reviewRepo,
    trailerRepo,
  };
}

describe('executeSeed (ejecución con DataSource mockeado)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    delete process.env.SEED_ADMIN_EMAIL;
    delete process.env.SEED_ADMIN_USERNAME;
    delete process.env.SEED_ADMIN_PASSWORD;
    delete process.env.SEED_CUSTOMER_EMAIL;
    delete process.env.SEED_CUSTOMER_USERNAME;
    delete process.env.SEED_CUSTOMER_PASSWORD;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('crea de forma idempotente usuarios ADMIN y CUSTOMER en entorno no productivo', async () => {
    const { dataSource, mongoModels, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource, mongoModels);

    expect(userRepo.items).toHaveLength(2);
    const admin = userRepo.items.find(
      (u) => u.email === 'admin@tiendavideojuegos.local',
    );
    const customer = userRepo.items.find(
      (u) => u.email === 'customer@tiendavideojuegos.local',
    );

    expect(admin).toBeDefined();
    expect(admin!.role).toBe(UserRole.ADMIN);
    expect(admin!.isActive).toBe(true);
    expect(admin!.username).toBe('admin');
    expect(isScryptHash(admin!.password)).toBe(true);
    expect((await verifyPassword('AdminDev123!', admin!.password)).valid).toBe(
      true,
    );

    expect(customer).toBeDefined();
    expect(customer!.role).toBe(UserRole.CUSTOMER);
    expect(customer!.isActive).toBe(true);
    expect(customer!.username).toBe('gamer_mx');
    expect(isScryptHash(customer!.password)).toBe(true);
    expect(
      (await verifyPassword('CustomerDev123!', customer!.password)).valid,
    ).toBe(true);

    userRepo.save.mockClear();
    await executeSeed(dataSource, mongoModels);

    expect(userRepo.items).toHaveLength(2);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('NO sobreescribe el role ni isActive de usuarios existentes en re-ejecuciones', async () => {
    const { dataSource, mongoModels, userRepo } = createMockSeedDataSource();

    userRepo.items.push(
      {
        id: 10,
        email: 'admin@tiendavideojuegos.local',
        username: 'admin_custom',
        password: 'CustomPassword1!',
        countryCode: 'MX',
        isActive: false,
        role: UserRole.CUSTOMER,
      } as unknown as User & MockRecord,
      {
        id: 11,
        email: 'customer@tiendavideojuegos.local',
        username: 'promoted_customer',
        password: 'CustomPassword2!',
        countryCode: 'MX',
        isActive: false,
        role: UserRole.ADMIN,
      } as unknown as User & MockRecord,
    );

    await executeSeed(dataSource, mongoModels);

    expect(userRepo.items).toHaveLength(2);
    expect(userRepo.save).not.toHaveBeenCalled();

    const existingAdmin = userRepo.items.find((u) => u.id === 10);
    const existingCustomer = userRepo.items.find((u) => u.id === 11);

    expect(existingAdmin?.role).toBe(UserRole.CUSTOMER);
    expect(existingAdmin?.isActive).toBe(false);
    expect(existingCustomer?.role).toBe(UserRole.ADMIN);
    expect(existingCustomer?.isActive).toBe(false);
  });

  it('en NODE_ENV === production sin SEED_ADMIN_PASSWORD ni SEED_CUSTOMER_PASSWORD omite crear ambos usuarios por seguridad', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SEED_ADMIN_PASSWORD;
    delete process.env.SEED_CUSTOMER_PASSWORD;

    const { dataSource, mongoModels, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource, mongoModels);

    expect(userRepo.items).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('SEED_ADMIN_PASSWORD'),
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('SEED_CUSTOMER_PASSWORD'),
    );
  });

  it('en NODE_ENV === production con SEED_ADMIN_PASSWORD y SEED_CUSTOMER_PASSWORD crea tanto ADMIN como CUSTOMER', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SEED_ADMIN_EMAIL = 'boss@tienda.com';
    process.env.SEED_ADMIN_USERNAME = 'super_admin';
    process.env.SEED_ADMIN_PASSWORD = 'UltraSecretProdPassword99!';
    process.env.SEED_CUSTOMER_PASSWORD = 'CustomerProdPassword99!';

    const { dataSource, mongoModels, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource, mongoModels);

    expect(userRepo.items).toHaveLength(2);
    const admin = userRepo.items.find((u) => u.email === 'boss@tienda.com');
    const customer = userRepo.items.find(
      (u) => u.email === 'customer@tiendavideojuegos.local',
    );

    expect(admin).toBeDefined();
    expect(admin!.role).toBe(UserRole.ADMIN);
    expect(admin!.username).toBe('super_admin');
    expect(isScryptHash(admin!.password)).toBe(true);
    expect(
      (await verifyPassword('UltraSecretProdPassword99!', admin!.password))
        .valid,
    ).toBe(true);
    expect(customer).toBeDefined();
    expect(customer!.role).toBe(UserRole.CUSTOMER);
    expect(
      (await verifyPassword('CustomerProdPassword99!', customer!.password))
        .valid,
    ).toBe(true);
  });

  it('evita colisión de email o username si SEED_ADMIN_EMAIL o SEED_ADMIN_USERNAME coincide con CUSTOMER', async () => {
    process.env.SEED_ADMIN_EMAIL = 'customer@tiendavideojuegos.local';

    const { dataSource, mongoModels, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource, mongoModels);

    expect(userRepo.items).toHaveLength(1);
    expect(userRepo.items[0].email).toBe('customer@tiendavideojuegos.local');
    expect(userRepo.items[0].role).toBe(UserRole.ADMIN);

    process.env.SEED_ADMIN_EMAIL = 'admin@tiendavideojuegos.local';
    process.env.SEED_ADMIN_USERNAME = 'gamer_mx';

    const secondMock = createMockSeedDataSource();
    await executeSeed(secondMock.dataSource, secondMock.mongoModels);

    expect(secondMock.userRepo.items).toHaveLength(1);
    expect(secondMock.userRepo.items[0].username).toBe('gamer_mx');
    expect(secondMock.userRepo.items[0].role).toBe(UserRole.ADMIN);
  });

  it('siembra de forma idempotente todas las 12 entidades del catálogo con conteos completos y gameId consistente', async () => {
    const mocks = createMockSeedDataSource();

    await executeSeed(mocks.dataSource, mocks.mongoModels);

    expect(mocks.gameRepo.items.length).toBeGreaterThanOrEqual(20);
    expect(mocks.gameRepo.items).toHaveLength(32);
    expect(mocks.counterModel.items.get('games')?.seq).toBe(32);
    expect(mocks.developerRepo.items).toHaveLength(25);
    expect(mocks.publisherRepo.items).toHaveLength(12);
    expect(mocks.genreRepo.items).toHaveLength(17);
    expect(mocks.platformRepo.items).toHaveLength(4);
    expect(mocks.editionRepo.items).toHaveLength(64);
    expect(mocks.keyRepo.items).toHaveLength(320);
    expect(mocks.sysReqRepo.items).toHaveLength(20);
    expect(mocks.promotionRepo.items).toHaveLength(3);
    expect(mocks.reviewRepo.items).toHaveLength(8);
    expect(mocks.trailerRepo.items).toHaveLength(3);

    // Verificar referencias numéricas gameId entre MongoDB y MySQL
    const gameIds = new Set(mocks.gameRepo.items.map((g) => g.id));
    expect(mocks.editionRepo.items.every((e) => gameIds.has(e.gameId))).toBe(true);
    expect(mocks.sysReqRepo.items.every((r) => gameIds.has(r.gameId))).toBe(true);
    expect(mocks.reviewRepo.items.every((r) => gameIds.has(r.gameId))).toBe(true);

    // Re-ejecución idempotente: no debe duplicar registros ni incrementar counters
    await executeSeed(mocks.dataSource, mocks.mongoModels);

    expect(mocks.gameRepo.items).toHaveLength(32);
    expect(mocks.counterModel.items.get('games')?.seq).toBe(32);
    expect(mocks.developerRepo.items).toHaveLength(25);
    expect(mocks.editionRepo.items).toHaveLength(64);
    expect(mocks.keyRepo.items).toHaveLength(320);
    expect(mocks.reviewRepo.items).toHaveLength(8);
    expect(mocks.trailerRepo.items).toHaveLength(3);
  });

  it('revierte los juegos creados en MongoDB y el contador si falla la transacción MySQL', async () => {
    const mocks = createMockSeedDataSource();
    mocks.trailerRepo.save.mockRejectedValueOnce(new Error('MySQL trailer error'));

    await expect(
      executeSeed(mocks.dataSource, mocks.mongoModels),
    ).rejects.toThrow('MySQL trailer error');

    expect(mocks.gameRepo.items).toHaveLength(0);
    expect(mocks.counterModel.items.has('games')).toBe(false);
  });
});

describe('runSeed (gestión de ciclo de vida y seguridad)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('bloquea --reset en NODE_ENV === production y cierra dataSource en finally', async () => {
    process.env.NODE_ENV = 'production';
    const mocks = createMockSeedDataSource();
    const fakeDs = Object.assign(mocks.dataSource, {
      isInitialized: false,
      initialize: vi.fn(async () => {
        fakeDs.isInitialized = true;
      }),
      synchronize: vi.fn(async () => undefined),
      destroy: vi.fn(async () => {
        fakeDs.isInitialized = false;
      }),
    });

    await expect(
      runSeed(
        fakeDs as unknown as DataSource,
        ['node', 'seed.js', '--reset'],
        mocks.mongoModels,
      ),
    ).rejects.toThrow('No se permite --reset en entorno de producción.');

    expect(fakeDs.synchronize).not.toHaveBeenCalled();
    expect(fakeDs.destroy).toHaveBeenCalledTimes(1);
  });

  it('cierra dataSource en finally incluso si executeSeed lanza un error', async () => {
    const mocks = createMockSeedDataSource();
    const fakeDs = {
      isInitialized: false,
      initialize: vi.fn(async () => {
        fakeDs.isInitialized = true;
      }),
      synchronize: vi.fn(async () => undefined),
      transaction: vi.fn(async () => {
        throw new Error('DB failure');
      }),
      destroy: vi.fn(async () => {
        fakeDs.isInitialized = false;
      }),
    };

    await expect(
      runSeed(
        fakeDs as unknown as DataSource,
        ['node', 'seed.js'],
        mocks.mongoModels,
      ),
    ).rejects.toThrow('DB failure');

    expect(fakeDs.destroy).toHaveBeenCalledTimes(1);
  });
});
