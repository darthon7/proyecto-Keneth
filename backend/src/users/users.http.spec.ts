import 'reflect-metadata';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './entities/user-role.enum.js';
import { RolesGuard } from '../common/auth/index.js';

interface TestAuthUser {
  id?: number;
  role?: UserRole;
  isActive?: boolean;
}

interface RequestWithTestUser extends Request {
  user?: TestAuthUser;
}

function createInMemoryUserRepository() {
  let nextId = 1;
  let users: User[] = [];

  const reset = (seedUsers: Array<Partial<User>> = []) => {
    users = seedUsers.map((u, index) => ({
      id: u.id ?? index + 1,
      email: u.email ?? `user${index + 1}@example.com`,
      password: u.password ?? 'Password123',
      username: u.username ?? `user_${index + 1}`,
      countryCode: u.countryCode ?? 'MX',
      isActive: u.isActive ?? true,
      role: u.role ?? UserRole.CUSTOMER,
      createdAt: u.createdAt ?? new Date(),
      orders: [],
      userLibraries: [],
      wishlists: [],
      reviews: [],
    }));
    nextId =
      users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  };

  const repo = {
    reset,
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
    find: vi.fn(
      async (options?: {
        where?: Partial<Pick<User, 'role'>>;
      }): Promise<User[]> => {
        const where = options?.where;
        if (!where) return [...users];
        return users.filter((u) => {
          if (where.role !== undefined && u.role !== where.role) return false;
          return true;
        });
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
    merge: vi.fn((target: User, source: Partial<User>): User => {
      return Object.assign(target, source);
    }),
    remove: vi.fn(async (entity: User): Promise<User> => {
      users = users.filter((u) => u.id !== entity.id);
      return entity;
    }),
  };

  return repo;
}

describe('UsersController HTTP Integration (NestJS TestingModule + Supertest + ValidationPipe)', () => {
  let app: INestApplication;
  const userRepo = createInMemoryUserRepository();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        RolesGuard,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    // Middleware de prueba para simular request.user poblado por una capa de autenticación
    app.use((req: RequestWithTestUser, _res: Response, next: NextFunction) => {
      const header = req.headers['x-test-user'];
      if (typeof header === 'string' && header.length > 0) {
        req.user = JSON.parse(header) as TestAuthUser;
      }
      next();
    });

    // ValidationPipe global idéntico a main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    userRepo.reset([
      {
        id: 1,
        email: 'admin@example.com',
        username: 'admin_user',
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        id: 2,
        email: 'customer@example.com',
        username: 'customer_user',
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    ]);
  });

  describe('POST /users', () => {
    it('crea un usuario con UserRole.CUSTOMER en el happy path (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'nuevo@example.com',
          password: 'Password123',
          username: 'nuevo_gamer',
          countryCode: 'MX',
        })
        .expect(201);

      expect(res.body.email).toBe('nuevo@example.com');
      expect(res.body.username).toBe('nuevo_gamer');
      expect(res.body.role).toBe(UserRole.CUSTOMER);
    });

    it('rechaza con 400 Bad Request si el cliente intenta auto-asignarse "role": "ADMIN"', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'escalate@example.com',
          password: 'Password123',
          username: 'hacker_admin',
          role: UserRole.ADMIN,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('role');
    });

    it('rechaza con 400 Bad Request si el cliente envía "role": "INVALID"', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'invalidrole@example.com',
          password: 'Password123',
          username: 'hacker_invalid',
          role: 'INVALID',
        })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('role');
    });

    it('rechaza con 400 Bad Request si el email o password no cumplen las reglas del DTO', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'correo-invalido',
          password: '123',
          username: 'usuario_valido',
        })
        .expect(400);
    });

    it('rechaza con 400 Bad Request si el correo ya está registrado', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'customer@example.com',
          password: 'Password123',
          username: 'duplicado',
        })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('retorna todos los usuarios sin filtro de rol (200 OK)', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('filtra por ?role=ADMIN correctamente (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?role=ADMIN')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe(UserRole.ADMIN);
    });

    it('filtra por ?role=CUSTOMER correctamente (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users?role=CUSTOMER')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe(UserRole.CUSTOMER);
    });

    it('rechaza con 400 Bad Request cuando ?role=COSTUMER (typo) vía ParseEnumPipe', async () => {
      await request(app.getHttpServer())
        .get('/users?role=COSTUMER')
        .expect(400);
    });

    it('rechaza con 400 Bad Request cuando ?role=SUPERADMIN vía ParseEnumPipe', async () => {
      await request(app.getHttpServer())
        .get('/users?role=SUPERADMIN')
        .expect(400);
    });
  });

  describe('PATCH /users/:id', () => {
    it('actualiza campos permitidos en el happy path sin alterar el rol (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2')
        .send({ username: 'customer_actualizado' })
        .expect(200);

      expect(res.body.username).toBe('customer_actualizado');
      expect(res.body.role).toBe(UserRole.CUSTOMER);
    });

    it('rechaza con 400 Bad Request si se intenta enviar "role": "ADMIN" en el body', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2')
        .send({ username: 'hacker', role: UserRole.ADMIN })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('role');
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('retorna 401 Unauthorized cuando request.user está ausente', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2/role')
        .send({ role: UserRole.ADMIN })
        .expect(401);

      expect(res.body.message).toBe('Usuario no autenticado');
    });

    it('retorna 403 Forbidden cuando el usuario autenticado tiene rol CUSTOMER', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 2, role: UserRole.CUSTOMER, isActive: true }),
        )
        .send({ role: UserRole.ADMIN })
        .expect(403);

      expect(res.body.message).toBe(
        'No tienes permisos para acceder a este recurso',
      );
    });

    it('retorna 403 Forbidden cuando el usuario autenticado es ADMIN pero está inactivo (isActive: false)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 1, role: UserRole.ADMIN, isActive: false }),
        )
        .send({ role: UserRole.ADMIN })
        .expect(403);

      expect(res.body.message).toBe('Cuenta de usuario inactiva');
    });

    it('retorna 200 OK y actualiza el rol cuando un ADMIN activo envía {"role": "ADMIN"}', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 1, role: UserRole.ADMIN, isActive: true }),
        )
        .send({ role: UserRole.ADMIN })
        .expect(200);

      expect(res.body.id).toBe(2);
      expect(res.body.role).toBe(UserRole.ADMIN);
    });

    it('retorna 200 OK y permite degradar a CUSTOMER cuando un ADMIN activo envía {"role": "CUSTOMER"}', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/1/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 99, role: UserRole.ADMIN, isActive: true }),
        )
        .send({ role: UserRole.CUSTOMER })
        .expect(200);

      expect(res.body.id).toBe(1);
      expect(res.body.role).toBe(UserRole.CUSTOMER);
    });

    it('retorna 400 Bad Request cuando un ADMIN activo envía {"role": "INVALID"}', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 1, role: UserRole.ADMIN, isActive: true }),
        )
        .send({ role: 'INVALID' })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('role');
    });

    it('retorna 400 Bad Request cuando un ADMIN activo envía propiedades extra no permitidas', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/2/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 1, role: UserRole.ADMIN, isActive: true }),
        )
        .send({ role: UserRole.ADMIN, isActive: false })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('isActive');
    });

    it('retorna 404 Not Found cuando el id de usuario no existe', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/9999/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 1, role: UserRole.ADMIN, isActive: true }),
        )
        .send({ role: UserRole.ADMIN })
        .expect(404);

      expect(res.body.message).toContain('9999');
    });

    it('retorna 400 Bad Request cuando el parámetro :id no es numérico (ParseIntPipe)', async () => {
      await request(app.getHttpServer())
        .patch('/users/not-a-number/role')
        .set(
          'x-test-user',
          JSON.stringify({ id: 1, role: UserRole.ADMIN, isActive: true }),
        )
        .send({ role: UserRole.ADMIN })
        .expect(400);
    });
  });
});
