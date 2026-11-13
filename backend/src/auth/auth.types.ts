import type { User } from '../users/entities/user.entity.js';
import type { UserRole } from '../users/entities/user-role.enum.js';

export type SafeUser = Omit<User, 'password'>;

export interface AuthenticatedUser {
  id: number;
  email?: string;
  username?: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

export function sanitizeUser<T extends { password?: string }>(
  user: T,
): Omit<T, 'password'> {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

