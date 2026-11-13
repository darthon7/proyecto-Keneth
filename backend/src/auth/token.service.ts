import {
  Injectable,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '../users/entities/user-role.enum.js';

const DEV_JWT_SECRET = 'tienda-videojuegos-dev-jwt-secret-key';
const DEFAULT_EXPIRES_IN_SECONDS = 86400; // 24 horas

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface SignTokenInput {
  sub: number;
  email: string;
  role: UserRole;
}

@Injectable()
export class TokenService implements OnModuleInit {
  onModuleInit(): void {
    this.getSecret();
  }

  private getSecret(): string {
    const envSecret = process.env.JWT_SECRET?.trim();
    if (process.env.NODE_ENV === 'production') {
      if (!envSecret) {
        throw new Error(
          'JWT_SECRET es obligatorio cuando NODE_ENV === "production"',
        );
      }
      return envSecret;
    }

    return envSecret || DEV_JWT_SECRET;
  }

  sign(input: SignTokenInput, expiresInSeconds?: number): string {
    const secret = this.getSecret();
    const now = Math.floor(Date.now() / 1000);
    const configuredTtl = Number(process.env.JWT_EXPIRES_IN_SECONDS);
    const ttl =
      typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds)
        ? Math.floor(expiresInSeconds)
        : Number.isFinite(configuredTtl) && configuredTtl > 0
          ? Math.floor(configuredTtl)
          : DEFAULT_EXPIRES_IN_SECONDS;

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload: JwtPayload = {
      sub: input.sub,
      email: input.email,
      role: input.role,
      iat: now,
      exp: now + ttl,
    };

    const headerB64 = Buffer.from(JSON.stringify(header), 'utf8').toString(
      'base64url',
    );
    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const signingInput = `${headerB64}.${payloadB64}`;
    const signatureB64 = createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url');

    return `${signingInput}.${signatureB64}`;
  }

  verify(token: string): JwtPayload {
    const secret = this.getSecret();

    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new UnauthorizedException('Token inválido');
    }

    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
      throw new UnauthorizedException('Token inválido');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: { alg?: unknown; typ?: unknown };
    try {
      header = JSON.parse(
        Buffer.from(headerB64, 'base64url').toString('utf8'),
      ) as { alg?: unknown; typ?: unknown };
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedException('Token inválido');
    }

    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSignatureB64 = createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url');

    const actualBuf = Buffer.from(signatureB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSignatureB64, 'utf8');

    if (
      actualBuf.length !== expectedBuf.length ||
      !timingSafeEqual(actualBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    let payload: Partial<JwtPayload>;
    try {
      payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      ) as Partial<JwtPayload>;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    if (
      typeof payload.sub !== 'number' ||
      !Number.isInteger(payload.sub) ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new UnauthorizedException('Token expirado');
    }

    return payload as JwtPayload;
  }
}

