export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum EditionFormat {
  DIGITAL = 'DIGITAL',
  PHYSICAL = 'PHYSICAL',
}

export enum KeyStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ASSIGNED = 'ASSIGNED',
  REVOKED = 'REVOKED',
}

export enum RequirementTier {
  MINIMUM = 'MINIMUM',
  RECOMMENDED = 'RECOMMENDED',
  ULTRA_RAYTRACING = 'ULTRA_RAYTRACING',
}

export interface Publisher {
  id: number;
  name: string;
  websiteUrl: string | null;
  supportEmail: string | null;
  country: string | null;
  games?: Game[];
}

export interface Developer {
  id: number;
  name: string;
  country: string | null;
  foundedYear: number | null;
  games?: Game[];
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  games?: Game[];
}

export interface Platform {
  id: number;
  name: string;
  code: string;
  iconUrl: string | null;
  editions?: GameEdition[];
}

export interface Game {
  id: number;
  title: string;
  slug: string;
  synopsis: string | null;
  esrbRating: string;
  releaseDate: string;
  coverImageUrl: string | null;
  createdAt: string;
  publisher: Publisher;
  developer: Developer;
  genres: Genre[];
  editions?: GameEdition[];
  systemRequirements?: SystemRequirement[];
  reviews?: Review[];
  wishlists?: Wishlist[];
}

export interface SystemRequirement {
  id: number;
  tier: RequirementTier;
  os: string;
  processor: string;
  ramGb: number;
  graphicsCard: string;
  storageGb: number;
  directxVersion: string | null;
  game: Game;
}

export interface GameEdition {
  id: number;
  editionName: string;
  format: EditionFormat;
  basePrice: number;
  isDlc: boolean;
  stockPhysical: number;
  createdAt: string;
  game: Game;
  platform: Platform;
  digitalKeys?: DigitalKey[];
}

export interface DigitalKey {
  id: string;
  code: string;
  codeHash: string;
  status: KeyStatus;
  batchId: string | null;
  updatedAt: string;
  gameEdition: GameEdition;
}

export interface Promotion {
  id: number;
  name: string;
  discountPercentage: number;
  couponCode: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface User {
  id: number;
  email: string;
  password: string;
  username: string;
  countryCode: string;
  isActive: boolean;
  createdAt: string;
  orders?: Order[];
  userLibraries?: UserLibrary[];
  wishlists?: Wishlist[];
  reviews?: Review[];
}

export interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentGatewayRef: string | null;
  createdAt: string;
  user: User;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  unitPrice: number;
  discountApplied: number;
  subtotal: number;
  order: Order;
  gameEdition: GameEdition;
  digitalKey: DigitalKey | null;
}

export interface UserLibrary {
  id: number;
  acquiredAt: string;
  isRevoked: boolean;
  user: User;
  gameEdition: GameEdition;
  order: Order | null;
}

export interface Wishlist {
  id: number;
  notifyOnSale: boolean;
  addedAt: string;
  user: User;
  game: Game;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  user: User;
  game: Game;
}

/* ---------- Payloads (DTOs del backend) ---------- */

export interface CreatePublisherPayload {
  name: string;
  websiteUrl?: string;
  supportEmail?: string;
  country?: string;
}

export interface CreateDeveloperPayload {
  name: string;
  country?: string;
  foundedYear?: number;
}

export interface CreateGenrePayload {
  name: string;
  slug: string;
  description?: string;
}

export interface CreatePlatformPayload {
  name: string;
  code: string;
  iconUrl?: string;
}

export interface CreateGamePayload {
  title: string;
  slug: string;
  synopsis?: string;
  esrbRating?: string;
  releaseDate: string;
  coverImageUrl?: string;
  publisherId: number;
  developerId: number;
  genreIds?: number[];
}

export interface CreateSystemRequirementPayload {
  tier: RequirementTier;
  os: string;
  processor: string;
  ramGb: number;
  graphicsCard: string;
  storageGb: number;
  directxVersion?: string;
  gameId: number;
}

export interface CreateGameEditionPayload {
  editionName?: string;
  format: EditionFormat;
  basePrice: number;
  isDlc?: boolean;
  stockPhysical?: number;
  gameId: number;
  platformId: number;
}

export interface CreateDigitalKeyPayload {
  code: string;
  codeHash: string;
  status?: KeyStatus;
  batchId?: string;
  gameEditionId: number;
}

export interface CreatePromotionPayload {
  name: string;
  discountPercentage: number;
  couponCode?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  username: string;
  countryCode?: string;
  isActive?: boolean;
}

export interface CreateOrderPayload {
  userId: number;
  couponCode?: string;
  paymentStatus?: PaymentStatus;
  paymentGatewayRef?: string;
  items: { gameEditionId: number; quantity?: number }[];
}

export interface CreateUserLibraryPayload {
  userId: number;
  gameEditionId: number;
  orderId?: number;
  isRevoked?: boolean;
}

export interface CreateWishlistPayload {
  userId: number;
  gameId: number;
  notifyOnSale?: boolean;
}

export interface CreateReviewPayload {
  userId: number;
  gameId: number;
  rating: number;
  title: string;
  body: string;
  helpfulCount?: number;
}

export type UpdatePayload<T> = Partial<T>;
