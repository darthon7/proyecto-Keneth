import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DataSource, EntityTarget } from 'typeorm';
import { executeSeed } from './seed.js';
import { isScryptHash, verifyPassword } from '../auth/password.util.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { Platform } from '../platforms/entities/platform.entity.js';
import { Genre } from '../genres/entities/genre.entity.js';
import { Publisher } from '../publishers/entities/publisher.entity.js';
import { Developer } from '../developers/entities/developer.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { DigitalKey } from '../digital-keys/entities/digital-key.entity.js';
import { SystemRequirement } from '../system-requirements/entities/system-requirement.entity.js';

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

  it('todas las portadas utilizan URLs HTTPS seguras y reales', () => {
    const coverMatches = seedContent.match(/coverImageUrl:\s*'([^']+)'/g);
    expect(coverMatches).not.toBeNull();
    expect(coverMatches!.length).toBeGreaterThanOrEqual(30);

    for (const match of coverMatches!) {
      const url = match.replace(/coverImageUrl:\s*'/, '').replace(/'/, '');
      expect(url.startsWith('https://')).toBe(true);
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
  id: number;
  [key: string]: unknown;
}

function matchesWhere(
  record: MockRecord,
  where: Record<string, unknown> | undefined,
): boolean {
  if (!where) {
    return true;
  }
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

function createInMemoryRepo<T extends MockRecord>() {
  const items: T[] = [];
  let nextId = 1;

  const repo = {
    items,
    findOne: vi.fn(
      async (options?: { where?: Record<string, unknown> }): Promise<T | null> => {
        const found = items.find((item) => matchesWhere(item, options?.where));
        return found ?? null;
      },
    ),
    find: vi.fn(
      async (options?: { where?: Record<string, unknown> }): Promise<T[]> => {
        return items.filter((item) => matchesWhere(item, options?.where));
      },
    ),
    create: vi.fn((data: Partial<T>): T => ({ ...data }) as T),
    save: vi.fn(async (entityOrEntities: T | T[]): Promise<T | T[]> => {
      const saveSingle = (entity: T): T => {
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

function createMockSeedDataSource() {
  const userRepo = createInMemoryRepo<User & MockRecord>();
  const platformRepo = createInMemoryRepo<Platform & MockRecord>();
  const genreRepo = createInMemoryRepo<Genre & MockRecord>();
  const publisherRepo = createInMemoryRepo<Publisher & MockRecord>();
  const developerRepo = createInMemoryRepo<Developer & MockRecord>();
  const gameRepo = createInMemoryRepo<Game & MockRecord>();
  const editionRepo = createInMemoryRepo<GameEdition & MockRecord>();
  const keyRepo = createInMemoryRepo<DigitalKey & MockRecord>();
  const sysReqRepo = createInMemoryRepo<SystemRequirement & MockRecord>();

  const repoMap = new Map<EntityTarget<unknown>, unknown>([
    [User, userRepo],
    [Platform, platformRepo],
    [Genre, genreRepo],
    [Publisher, publisherRepo],
    [Developer, developerRepo],
    [Game, gameRepo],
    [GameEdition, editionRepo],
    [DigitalKey, keyRepo],
    [SystemRequirement, sysReqRepo],
  ]);

  const dataSource = {
    getRepository: vi.fn((entity: EntityTarget<unknown>) => {
      const repo = repoMap.get(entity);
      if (!repo) {
        throw new Error(`Repositorio no mockeado para entidad: ${String(entity)}`);
      }
      return repo;
    }),
  } as unknown as DataSource;

  return { dataSource, userRepo };
}

describe('executeSeed (ejecución con DataSource mockeado)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    delete process.env.SEED_ADMIN_EMAIL;
    delete process.env.SEED_ADMIN_USERNAME;
    delete process.env.SEED_ADMIN_PASSWORD;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('crea de forma idempotente usuarios ADMIN y CUSTOMER en entorno no productivo', async () => {
    const { dataSource, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource);

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
    await executeSeed(dataSource);

    expect(userRepo.items).toHaveLength(2);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('NO sobreescribe el role ni isActive de usuarios existentes en re-ejecuciones', async () => {
    const { dataSource, userRepo } = createMockSeedDataSource();

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

    await executeSeed(dataSource);

    expect(userRepo.items).toHaveLength(2);
    expect(userRepo.save).not.toHaveBeenCalled();

    const existingAdmin = userRepo.items.find((u) => u.id === 10);
    const existingCustomer = userRepo.items.find((u) => u.id === 11);

    expect(existingAdmin?.role).toBe(UserRole.CUSTOMER);
    expect(existingAdmin?.isActive).toBe(false);
    expect(existingCustomer?.role).toBe(UserRole.ADMIN);
    expect(existingCustomer?.isActive).toBe(false);
  });

  it('en NODE_ENV === production sin SEED_ADMIN_PASSWORD omite crear el ADMIN y crea solo CUSTOMER', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SEED_ADMIN_PASSWORD;

    const { dataSource, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource);

    expect(userRepo.items).toHaveLength(1);
    expect(userRepo.items[0].email).toBe('customer@tiendavideojuegos.local');
    expect(userRepo.items[0].role).toBe(UserRole.CUSTOMER);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('SEED_ADMIN_PASSWORD'),
    );
  });

  it('en NODE_ENV === production con SEED_ADMIN_PASSWORD crea tanto ADMIN como CUSTOMER', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SEED_ADMIN_EMAIL = 'boss@tienda.com';
    process.env.SEED_ADMIN_USERNAME = 'super_admin';
    process.env.SEED_ADMIN_PASSWORD = 'UltraSecretProdPassword99!';

    const { dataSource, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource);

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
  });

  it('evita colisión de email si SEED_ADMIN_EMAIL coincide con el email de CUSTOMER', async () => {
    process.env.SEED_ADMIN_EMAIL = 'customer@tiendavideojuegos.local';

    const { dataSource, userRepo } = createMockSeedDataSource();

    await executeSeed(dataSource);

    expect(userRepo.items).toHaveLength(1);
    expect(userRepo.items[0].email).toBe('customer@tiendavideojuegos.local');
    expect(userRepo.items[0].role).toBe(UserRole.ADMIN);
  });
});
