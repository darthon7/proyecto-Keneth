import { apiClient } from './client';
import type {
  AdminSummary,
  AuthResponse,
  CreateDeveloperPayload,
  CreateDigitalKeyPayload,
  CreateGameEditionPayload,
  CreateGamePayload,
  CreateGenrePayload,
  CreateOrderPayload,
  CreatePlatformPayload,
  CreatePromotionPayload,
  CreatePublisherPayload,
  CreateReviewPayload,
  CreateSystemRequirementPayload,
  CreateUserLibraryPayload,
  CreateUserPayload,
  CreateWishlistPayload,
  Developer,
  DigitalKey,
  Game,
  GameEdition,
  Genre,
  LoginPayload,
  Order,
  OrderItem,
  Platform,
  Promotion,
  Publisher,
  RegisterPayload,
  Review,
  SafeUser,
  SystemRequirement,
  UpdatePayload,
  User,
  UserLibrary,
  UserRole,
  Wishlist,
} from '@/types';

export interface ResourceApi<T, TCreate = unknown, TUpdate = unknown> {
  list(): Promise<T[]>;
  get(id: number | string): Promise<T>;
  create(payload: TCreate): Promise<T>;
  update(id: number | string, payload: TUpdate): Promise<T>;
  remove(id: number | string): Promise<T>;
}

function crud<T, TCreate = unknown, TUpdate = unknown>(
  resource: string,
): ResourceApi<T, TCreate, TUpdate> {
  return {
    async list() {
      const { data } = await apiClient.get<T[]>(`/${resource}`);
      return data;
    },
    async get(id) {
      const { data } = await apiClient.get<T>(`/${resource}/${id}`);
      return data;
    },
    async create(payload) {
      const { data } = await apiClient.post<T>(`/${resource}`, payload);
      return data;
    },
    async update(id, payload) {
      const { data } = await apiClient.patch<T>(`/${resource}/${id}`, payload);
      return data;
    },
    async remove(id) {
      const { data } = await apiClient.delete<T>(`/${resource}/${id}`);
      return data;
    },
  };
}

export const publishersApi = crud<Publisher, CreatePublisherPayload, UpdatePayload<CreatePublisherPayload>>(
  'publishers',
);

export const developersApi = crud<Developer, CreateDeveloperPayload, UpdatePayload<CreateDeveloperPayload>>(
  'developers',
);

export const genresApi = crud<Genre, CreateGenrePayload, UpdatePayload<CreateGenrePayload>>(
  'genres',
);

export const platformsApi = crud<Platform, CreatePlatformPayload, UpdatePayload<CreatePlatformPayload>>(
  'platforms',
);

export const gamesApi = crud<Game, CreateGamePayload, UpdatePayload<CreateGamePayload>>(
  'games',
);

export const systemRequirementsApi = crud<
  SystemRequirement,
  CreateSystemRequirementPayload,
  UpdatePayload<CreateSystemRequirementPayload>
>('system-requirements');

export const gameEditionsApi = crud<
  GameEdition,
  CreateGameEditionPayload,
  UpdatePayload<CreateGameEditionPayload>
>('game-editions');

export const digitalKeysApi = crud<
  DigitalKey,
  CreateDigitalKeyPayload,
  UpdatePayload<CreateDigitalKeyPayload>
>('digital-keys');

export const promotionsApi = crud<
  Promotion,
  CreatePromotionPayload,
  UpdatePayload<CreatePromotionPayload>
>('promotions');

export const usersApi = crud<User, CreateUserPayload, UpdatePayload<CreateUserPayload>>(
  'users',
);

export const reviewsApi = crud<Review, CreateReviewPayload, UpdatePayload<CreateReviewPayload>>(
  'reviews',
);

export const wishlistsApi = crud<
  Wishlist,
  CreateWishlistPayload,
  UpdatePayload<CreateWishlistPayload>
>('wishlists');

export const userLibrariesApi = crud<
  UserLibrary,
  CreateUserLibraryPayload,
  UpdatePayload<CreateUserLibraryPayload>
>('user-libraries');

export interface OrderWithItems {
  order: Order;
  items: OrderItem[];
}

export const ordersApi = {
  ...crud<Order, CreateOrderPayload, UpdatePayload<CreateOrderPayload>>('orders'),

  /** El backend responde `{ order, items }` al crear una orden. */
  async create(payload: CreateOrderPayload): Promise<OrderWithItems> {
    const { data } = await apiClient.post<OrderWithItems>('/orders', payload);
    return data;
  },
};

export const reviewsExtraApi = {
  /** Reseñas de un juego concreto: GET /reviews/game/:gameId */
  byGame(gameId: number): Promise<Review[]> {
    return apiClient
      .get<Review[]>(`/reviews/game/${gameId}`)
      .then((response) => response.data);
  },
};

export const userLibrariesExtraApi = {
  /** Biblioteca activa de un usuario: GET /user-libraries/user/:userId */
  byUser(userId: number): Promise<UserLibrary[]> {
    return apiClient
      .get<UserLibrary[]>(`/user-libraries/user/${userId}`)
      .then((response) => response.data);
  },
};

export const wishlistsExtraApi = {
  /** Wishlist de un usuario: GET /wishlists/user/:userId */
  byUser(userId: number): Promise<Wishlist[]> {
    return apiClient
      .get<Wishlist[]>(`/wishlists/user/${userId}`)
      .then((response) => response.data);
  },
};

export const authApi = {
  /** Inicia sesión con correo y contraseña: POST /auth/login */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },
  /** Registra una cuenta de cliente: POST /auth/register */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },
  /** Hidrata el perfil autenticado actual: GET /auth/me */
  async me(): Promise<SafeUser> {
    const { data } = await apiClient.get<SafeUser>('/auth/me');
    return data;
  },
};

export const usersExtraApi = {
  /** Actualiza el rol de un usuario (solo ADMIN): PATCH /users/:id/role */
  async updateRole(id: number | string, role: UserRole): Promise<SafeUser> {
    const { data } = await apiClient.patch<SafeUser>(`/users/${id}/role`, { role });
    return data;
  },
};

export const ordersExtraApi = {
  /** Confirma el pago de una orden pendiente en el servidor: POST /orders/:id/confirm-payment */
  async confirmPayment(orderId: number): Promise<Order> {
    const { data } = await apiClient.post<Order>(`/orders/${orderId}/confirm-payment`);
    return data;
  },
};

export const adminApi = {
  /** Obtiene conteos agregados ligeros para el panel admin: GET /admin/summary */
  async summary(): Promise<AdminSummary> {
    const { data } = await apiClient.get<AdminSummary>('/admin/summary');
    return data;
  },
};
