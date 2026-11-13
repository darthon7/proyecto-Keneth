import 'reflect-metadata';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  type INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import {
  hashPassword,
  isScryptHash,
  verifyPassword,
} from './password.util.js';
import { TokenService } from './token.service.js';

function createInMemoryAuthUserRepository() {
  let nextId = 1;
  let users: User[] = [];

  const reset = async (seedUsers: Array<Partial<User>> = []) => {
    users = await Promise.all(
      seedUsers.map(async (u, index) => ({
        id: u.id ?? index + 1,
        email: u.email ?? `user${index + 1}@example.com`,
        password: u.password ?? (await hashPassword('Password123!')),
        username: u.username ?? `user_${index + 1}`,
        countryCode: u.countryCode ?? 'MX',
        isActive: u.isActive ?? true,
        role: u.role ?? UserRole.CUSTOMER,
        createdAt: u.createdAt ?? new Date(),
        orders: [],
        userLibraries: [],
        wishlists: [],
        reviews: [],
      })),
    );
    nextId =
      users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  };

  return {
    reset,
    getAllInternal: () => users,
    findOneBy: vi.fn(
      async (where: Partial<Pick<User, 'id' | 'email'>>): Promise<User | null> => {
        return (
          users.find((u) => {
            if (where.id !== undefined && u.id !== where.id) return false;
            if (where.email !== undefined && u.email !== where.email)
              return false;
            return true;
          }) ?? null
        );
      },
    ),
    findOne: vi.fn(
      async (options: {
        where?: Partial<Pick<User, 'id' | 'email'>>;
      }): Promise<User | null> => {
        const where = options?.where;
        if (!where) return users[0] ?? null;
        return (
          users.find((u) => {
            if (where.id !== undefined && u.id !== where.id) return false;
            if (where.email !== undefined && u.email !== where.email)
              return false;
            return true;
          }) ?? null
        );
      },
    ),
    create: vi.fn((data: Partial<User>): User => {
      return {
        id: 0,
        email: data.email ?? '',
        password: data.password ?? '',
        username: data.username ?? '',
        countryCode: data.countryCode ?? 'MX',
        isActive: data.isActive ?? true,
        role: data.role ?? UserRole.CUSTOMER,
        createdAt: new Date(),
        orders: [],
        userLibraries: [],
        wishlists: [],
        reviews: [],
      };
    }),
    save: vi.fn(async (entity: User): Promise<User> => {
      if (!entity.id) {
        entity.id = nextId++;
        users.push(entity);
        return entity;
      }
      const idx = users.findIndex((u) => u.id === entity.id);
      if (idx >= 0) {
        users[idx] = entity;
      } else {
        users.push(entity);
      }
      return entity;
    }),
  };
}

describe('PasswordUtil (scrypt + migración legacy)', () => {
  it('genera hashes scrypt$<saltHex>$<keyHex> y verifica correctamente', async () => {
    const hash = await hashPassword('MySecretPass123!');
    expect(isScryptHash(hash)).toBe(true);
    expect(hash.split('$')).toHaveLength(3);

    expect(await verifyPassword('MySecretPass123!', hash)).toEqual({
      valid: true,
      needsRehash: false,
    });
    expect(await verifyPassword('WrongPass', hash)).toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it('soporta contraseñas legacy en texto plano marcando needsRehash: true al coincidir', async () => {
    expect(await verifyPassword('LegacyPass!', 'LegacyPass!')).toEqual({
      valid: true,
      needsRehash: true,
    });
    expect(await verifyPassword('OtherPass', 'LegacyPass!')).toEqual({
      valid: false,
      needsRehash: false,
    });
  });
});

describe('TokenService (HS256 nativo)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('firma y verifica tokens JWT válidos con sub, email, role, iat y exp', () => {
    const tokenService = new TokenService();
    const token = tokenService.sign({
      sub: 42,
      email: 'gamer@example.com',
      role: UserRole.CUSTOMER,
    });

    const payload = tokenService.verify(token);
    expect(payload.sub).toBe(42);
    expect(payload.email).toBe('gamer@example.com');
    expect(payload.role).toBe(UserRole.CUSTOMER);
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('rechaza tokens con firma adulterada o formato inválido', () => {
    const tokenService = new TokenService();
    const token = tokenService.sign({
      sub: 1,
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });

    const [h, p, s] = token.split('.');
    const tamperedSig = `${s.slice(0, -1)}${s.endsWith('A') ? 'B' : 'A'}`;
    expect(() => tokenService.verify(`${h}.${p}.${tamperedSig}`)).toThrow(
      UnauthorizedException,
    );
    expect(() => tokenService.verify('not.a.valid.jwt')).toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza tokens expirados', () => {
    const tokenService = new TokenService();
    const expiredToken = tokenService.sign(
      {
        sub: 1,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      },
      -10,
    );

    expect(() => tokenService.verify(expiredToken)).toThrow(
      UnauthorizedException,
    );
  });

  it('exige JWT_SECRET cuando NODE_ENV === "production"', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    const tokenService = new TokenService();
    expect(() => tokenService.onModuleInit()).toThrow(/JWT_SECRET/);
    expect(() =>
      tokenService.sign({
        sub: 1,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      }),
    ).toThrow(/JWT_SECRET/);

    process.env.JWT_SECRET = 'super-strong-production-secret-32-chars';
    const token = tokenService.sign({
      sub: 1,
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    expect(tokenService.verify(token).sub).toBe(1);
  });
});

describe('AuthController HTTP Integration (/auth/login, /auth/register, /auth/me)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const userRepo = createInMemoryAuthUserRepository();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        TokenService,
        JwtAuthGuard,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    tokenService = moduleRef.get(TokenService);
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await userRepo.reset([
      {
        id: 1,
        email: 'admin@example.com',
        password: await hashPassword('AdminPass123!'),
        username: 'admin_user',
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        id: 2,
        email: 'legacy@example.com',
        password: 'LegacyPlainPassword1!',
        username: 'legacy_user',
        role: UserRole.CUSTOMER,
        isActive: true,
      },
      {
        id: 3,
        email: 'inactive@example.com',
        password: await hashPassword('InactivePass1!'),
        username: 'inactive_user',
        role: UserRole.CUSTOMER,
        isActive: false,
      },
    ]);
  });

  describe('POST /auth/login', () => {
    it('retorna 200 OK, accessToken y user sanitizado para credenciales válidas', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPass123!' })
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.user.id).toBe(1);
      expect(res.body.user.email).toBe('admin@example.com');
      expect(res.body.user.role).toBe(UserRole.ADMIN);
      expect(res.body.user).not.toHaveProperty('password');

      const decoded = tokenService.verify(res.body.accessToken as string);
      expect(decoded.sub).toBe(1);
      expect(decoded.role).toBe(UserRole.ADMIN);
    });

    it('migra automáticamente una contraseña legacy en texto plano a scrypt en BD al hacer login exitoso', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'legacy@example.com', password: 'LegacyPlainPassword1!' })
        .expect(200);

      expect(res.body.user.id).toBe(2);
      expect(res.body.user).not.toHaveProperty('password');

      const migrated = userRepo
        .getAllInternal()
        .find((u) => u.id === 2);
      expect(migrated).toBeDefined();
      expect(isScryptHash(migrated!.password)).toBe(true);
      expect(
        (await verifyPassword('LegacyPlainPassword1!', migrated!.password))
          .valid,
      ).toBe(true);
    });

    it('retorna 401 Unauthorized para contraseña incorrecta o email inexistente', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'WrongPassword!' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'missing@example.com', password: 'AdminPass123!' })
        .expect(401);
    });

    it('retorna 403 Forbidden si la cuenta está inactiva (isActive: false)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inactive@example.com', password: 'InactivePass1!' })
        .expect(403);
    });
  });

  describe('POST /auth/register', () => {
    it('registra un nuevo usuario forzando role CUSTOMER, hashea password y retorna accessToken sin password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newplayer@example.com',
          password: 'NewPlayer123!',
          username: 'new_player',
          countryCode: 'MX',
        })
        .expect(201);

      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.user.email).toBe('newplayer@example.com');
      expect(res.body.user.role).toBe(UserRole.CUSTOMER);
      expect(res.body.user).not.toHaveProperty('password');

      const stored = userRepo
        .getAllInternal()
        .find((u) => u.email === 'newplayer@example.com');
      expect(stored).toBeDefined();
      expect(isScryptHash(stored!.password)).toBe(true);
    });

    it('rechaza con 400 si el cliente intenta enviar role en /auth/register', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'hacker@example.com',
          password: 'Password123!',
          username: 'hacker',
          role: UserRole.ADMIN,
        })
        .expect(400);
    });

    it('retorna 409 Conflict si el correo ya está registrado', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'Password123!',
          username: 'duplicate',
        })
        .expect(409);
    });
  });

  describe('GET /auth/me', () => {
    it('retorna 401 sin token o con token inválido/expirado', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer token.invalido.aqui')
        .expect(401);

      const expired = tokenService.sign(
        { sub: 1, email: 'admin@example.com', role: UserRole.ADMIN },
        -60,
      );
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);
    });

    it('retorna 403 si el usuario del token fue desactivado en BD', async () => {
      const token = tokenService.sign({
        sub: 3,
        email: 'inactive@example.com',
        role: UserRole.CUSTOMER,
      });

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('retorna 200 OK con el perfil actualizado de BD y sin password cuando el Bearer token es válido', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'AdminPass123!' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(1);
      expect(res.body.email).toBe('admin@example.com');
      expect(res.body.role).toBe(UserRole.ADMIN);
      expect(res.body).not.toHaveProperty('password');
    });
  });
});

