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
import { hashPassword, JwtAuthGuard, TokenService } from '../../auth/index.js';
import { RolesGuard } from './roles.guard.js';
import { User } from '../../users/entities/user.entity.js';
import { UserRole } from '../../users/entities/user-role.enum.js';
import { DevelopersController } from '../../developers/developers.controller.js';
import { DevelopersService } from '../../developers/developers.service.js';
import { GamesController } from '../../games/games.controller.js';
import { GamesService } from '../../games/games.service.js';
import { DigitalKeysController } from '../../digital-keys/digital-keys.controller.js';
import { DigitalKeysService } from '../../digital-keys/digital-keys.service.js';
import { OrdersController } from '../../orders/orders.controller.js';
import { OrdersService } from '../../orders/orders.service.js';
import { UserLibrariesController } from '../../user-libraries/user-libraries.controller.js';
import { UserLibrariesService } from '../../user-libraries/user-libraries.service.js';
import { WishlistsController } from '../../wishlists/wishlists.controller.js';
import { WishlistsService } from '../../wishlists/wishlists.service.js';
import { ReviewsController } from '../../reviews/reviews.controller.js';
import { ReviewsService } from '../../reviews/reviews.service.js';

describe('RBAC HTTP Integration (Developers, Games, DigitalKeys, Orders, Libraries, Wishlists, Reviews)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  let adminToken: string;
  let customerToken: string;
  let otherCustomerToken: string;

  let users: User[] = [];

  const mockUserRepo = {
    findOne: vi.fn(
      async (options: { where?: { id?: number } }) =>
        users.find((u) => u.id === options?.where?.id) ?? null,
    ),
  };

  const mockDevelopersService = {
    create: vi.fn(async (dto: Record<string, unknown>) => ({ id: 10, ...dto })),
    findAll: vi.fn(async () => [{ id: 1, name: 'Nintendo EPD' }]),
    findOne: vi.fn(async (id: number) => ({ id, name: 'Nintendo EPD' })),
    update: vi.fn(async (id: number, dto: Record<string, unknown>) => ({
      id,
      ...dto,
    })),
    remove: vi.fn(async (id: number) => ({ id, deleted: true })),
  };

  const mockGamesService = {
    create: vi.fn(async (dto: Record<string, unknown>) => ({ id: 20, ...dto })),
    findAll: vi.fn(async () => [{ id: 1, title: 'Hades' }]),
    findOne: vi.fn(async (id: number) => ({ id, title: 'Hades' })),
    update: vi.fn(async (id: number, dto: Record<string, unknown>) => ({
      id,
      ...dto,
    })),
    remove: vi.fn(async (id: number) => ({ id, deleted: true })),
  };

  const mockDigitalKeysService = {
    create: vi.fn(async (dto: Record<string, unknown>) => ({
      id: 'key-1',
      ...dto,
    })),
    findAll: vi.fn(async () => [{ id: 'key-1', code: 'AAAA-BBBB-CCCC-DDDD' }]),
    findOne: vi.fn(async (id: string) => ({
      id,
      code: 'AAAA-BBBB-CCCC-DDDD',
    })),
    update: vi.fn(async (id: string, dto: Record<string, unknown>) => ({
      id,
      ...dto,
    })),
    remove: vi.fn(async (id: string) => ({ id, deleted: true })),
  };

  const mockOrdersService = {
    create: vi.fn(async (dto: Record<string, unknown>) => ({
      order: { id: 100, user: { id: dto.userId } },
      items: [],
    })),
    findAll: vi.fn(async () => [
      { id: 100, user: { id: 2 } },
      { id: 101, user: { id: 3 } },
    ]),
    findByUser: vi.fn(async (userId: number) => [
      { id: 100, user: { id: userId } },
    ]),
    findOne: vi.fn(async (id: number) => ({ id, user: { id: 2 } })),
    update: vi.fn(async (id: number, dto: Record<string, unknown>) => ({
      id,
      ...dto,
    })),
    remove: vi.fn(async (id: number) => ({ id, deleted: true })),
  };

  const mockUserLibrariesService = {
    create: vi.fn(async (dto: Record<string, unknown>) => ({ id: 1, ...dto })),
    findAll: vi.fn(async () => [{ id: 1, user: { id: 2 } }]),
    findByUser: vi.fn(async (userId: number) => [
      { id: 1, user: { id: userId } },
    ]),
    findOne: vi.fn(async (id: number) => ({ id, user: { id: 2 } })),
    update: vi.fn(async (id: number, dto: Record<string, unknown>) => ({
      id,
      ...dto,
    })),
    remove: vi.fn(async (id: number) => ({ id, deleted: true })),
  };

  const mockWishlistsService = {
    create: vi.fn(async (dto: Record<string, unknown>) => ({ id: 1, ...dto })),
    findAll: vi.fn(async () => [{ id: 1, user: { id: 2 } }]),
    findByUser: vi.fn(async (userId: number) => [
      { id: 1, user: { id: userId } },
    ]),
    findOne: vi.fn(async (id: number) => ({ id, user: { id: 2 } })),
    update: vi.fn(async (id: number, dto: Record<string, unknown>) => ({
      id,
      ...dto,
    })),
    remove: vi.fn(async (id: number) => ({ id, deleted: true })),
  };

  const mockReviewsService = {
    create: vi.fn(async (dto: Record<string, unknown>) => ({ id: 1, ...dto })),
    findAll: vi.fn(async () => [{ id: 1, title: 'Excelente' }]),
    findByGame: vi.fn(async (gameId: number) => [{ id: 1, gameId }]),
    findOne: vi.fn(async (id: number) => ({ id, user: { id: 2 } })),
    update: vi.fn(async (id: number, dto: Record<string, unknown>) => ({
      id,
      ...dto,
    })),
    remove: vi.fn(async (id: number) => ({ id, deleted: true })),
  };

  beforeAll(async () => {
    users = [
      {
        id: 1,
        email: 'admin@tienda.local',
        password: await hashPassword('Admin123!'),
        username: 'admin',
        countryCode: 'MX',
        isActive: true,
        role: UserRole.ADMIN,
        createdAt: new Date(),
        orders: [],
        userLibraries: [],
        wishlists: [],
        reviews: [],
      },
      {
        id: 2,
        email: 'customer@tienda.local',
        password: await hashPassword('Customer123!'),
        username: 'gamer_1',
        countryCode: 'MX',
        isActive: true,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        orders: [],
        userLibraries: [],
        wishlists: [],
        reviews: [],
      },
      {
        id: 3,
        email: 'other@tienda.local',
        password: await hashPassword('Other123!'),
        username: 'gamer_2',
        countryCode: 'MX',
        isActive: true,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        orders: [],
        userLibraries: [],
        wishlists: [],
        reviews: [],
      },
    ];

    const moduleRef = await Test.createTestingModule({
      controllers: [
        DevelopersController,
        GamesController,
        DigitalKeysController,
        OrdersController,
        UserLibrariesController,
        WishlistsController,
        ReviewsController,
      ],
      providers: [
        TokenService,
        JwtAuthGuard,
        RolesGuard,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: DevelopersService, useValue: mockDevelopersService },
        { provide: GamesService, useValue: mockGamesService },
        { provide: DigitalKeysService, useValue: mockDigitalKeysService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: UserLibrariesService, useValue: mockUserLibrariesService },
        { provide: WishlistsService, useValue: mockWishlistsService },
        { provide: ReviewsService, useValue: mockReviewsService },
      ],
    }).compile();

    tokenService = moduleRef.get(TokenService);
    adminToken = tokenService.sign({
      sub: 1,
      email: 'admin@tienda.local',
      role: UserRole.ADMIN,
    });
    customerToken = tokenService.sign({
      sub: 2,
      email: 'customer@tienda.local',
      role: UserRole.CUSTOMER,
    });
    otherCustomerToken = tokenService.sign({
      sub: 3,
      email: 'other@tienda.local',
      role: UserRole.CUSTOMER,
    });

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DevelopersController (/developers)', () => {
    it('GET /developers y GET /developers/:id son públicos (200 OK)', async () => {
      await request(app.getHttpServer()).get('/developers').expect(200);
      await request(app.getHttpServer()).get('/developers/1').expect(200);
    });

    it('POST /developers retorna 401 anónimo, 403 CUSTOMER y 201 ADMIN', async () => {
      const payload = { name: 'Studio Test', country: 'JP', foundedYear: 2020 };

      await request(app.getHttpServer())
        .post('/developers')
        .send(payload)
        .expect(401);

      await request(app.getHttpServer())
        .post('/developers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload)
        .expect(403);

      await request(app.getHttpServer())
        .post('/developers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);
    });

    it('PATCH y DELETE /developers/:id retornan 401 anónimo, 403 CUSTOMER y 200 ADMIN', async () => {
      await request(app.getHttpServer())
        .patch('/developers/1')
        .send({ name: 'Updated' })
        .expect(401);

      await request(app.getHttpServer())
        .patch('/developers/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Updated' })
        .expect(403);

      await request(app.getHttpServer())
        .patch('/developers/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(200);

      await request(app.getHttpServer()).delete('/developers/1').expect(401);

      await request(app.getHttpServer())
        .delete('/developers/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete('/developers/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GamesController (/games)', () => {
    const gamePayload = {
      title: 'Test Game',
      slug: 'test-game',
      synopsis: 'A great test game',
      esrbRating: 'T',
      releaseDate: '2025-01-01',
      publisherId: 1,
      developerId: 1,
    };

    it('GET /games y GET /games/:id son públicos (200 OK)', async () => {
      await request(app.getHttpServer()).get('/games').expect(200);
      await request(app.getHttpServer()).get('/games/1').expect(200);
    });

    it('POST, PATCH y DELETE /games retornan 401 anónimo, 403 CUSTOMER y 201/200 ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send(gamePayload)
        .expect(401);

      await request(app.getHttpServer())
        .post('/games')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(gamePayload)
        .expect(403);

      await request(app.getHttpServer())
        .post('/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gamePayload)
        .expect(201);

      await request(app.getHttpServer())
        .patch('/games/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ title: 'Hack' })
        .expect(403);

      await request(app.getHttpServer())
        .patch('/games/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated' })
        .expect(200);

      await request(app.getHttpServer())
        .delete('/games/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete('/games/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('DigitalKeysController (/digital-keys)', () => {
    it('todos los endpoints (GET, POST, PATCH, DELETE) retornan 401 anónimo, 403 CUSTOMER y 200/201 ADMIN', async () => {
      const keyPayload = {
        code: 'ABCD-1234-EFGH-5678',
        codeHash: 'a'.repeat(64),
        gameEditionId: 1,
      };

      await request(app.getHttpServer()).get('/digital-keys').expect(401);
      await request(app.getHttpServer())
        .get('/digital-keys')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .get('/digital-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/digital-keys/key-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .get('/digital-keys/key-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/digital-keys')
        .send(keyPayload)
        .expect(401);
      await request(app.getHttpServer())
        .post('/digital-keys')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(keyPayload)
        .expect(403);
      await request(app.getHttpServer())
        .post('/digital-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyPayload)
        .expect(201);

      await request(app.getHttpServer())
        .patch('/digital-keys/key-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ batchId: 'NEW' })
        .expect(403);
      await request(app.getHttpServer())
        .patch('/digital-keys/key-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ batchId: 'NEW' })
        .expect(200);

      await request(app.getHttpServer())
        .delete('/digital-keys/key-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .delete('/digital-keys/key-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Orders, UserLibraries, Wishlists & Reviews RBAC', () => {
    it('Orders: CUSTOMER solo crea/consulta sus propias órdenes; PATCH/DELETE solo ADMIN', async () => {
      await request(app.getHttpServer()).get('/orders').expect(401);

      await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(mockOrdersService.findByUser).toHaveBeenCalledWith(2);

      await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(mockOrdersService.findAll).toHaveBeenCalled();

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ userId: 2, items: [{ gameEditionId: 1, quantity: 1 }] })
        .expect(403);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ userId: 2, items: [{ gameEditionId: 1, quantity: 1 }] })
        .expect(201);

      await request(app.getHttpServer())
        .get('/orders/100')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/orders/100')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch('/orders/100')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .delete('/orders/100')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('UserLibraries: GET global y mutaciones solo ADMIN; GET /user/:userId dueño o ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/user-libraries')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/user-libraries/user/2')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/user-libraries/user/2')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });

    it('Wishlists: dueño o ADMIN; GET /wishlists global solo ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/wishlists')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/wishlists/user/2')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/wishlists/user/2')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
    });

    it('Reviews: GET públicos; POST/PATCH/DELETE autenticados dueño o ADMIN', async () => {
      await request(app.getHttpServer()).get('/reviews').expect(200);
      await request(app.getHttpServer()).get('/reviews/game/1').expect(200);
      await request(app.getHttpServer()).get('/reviews/1').expect(200);

      await request(app.getHttpServer())
        .post('/reviews')
        .send({ userId: 2, gameId: 1, rating: 5, title: 'Top', body: 'Buenardo' })
        .expect(401);

      await request(app.getHttpServer())
        .patch('/reviews/1')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ title: 'Hijack' })
        .expect(403);

      await request(app.getHttpServer())
        .patch('/reviews/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ title: 'Editado' })
        .expect(200);

      await request(app.getHttpServer())
        .delete('/reviews/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});

