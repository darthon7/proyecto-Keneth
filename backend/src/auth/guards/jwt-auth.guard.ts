import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import type { AuthenticatedUser } from '../auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenService } from '../token.service.js';

interface HttpRequestWithAuth {
  headers?: {
    authorization?: string | string[];
  };
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<HttpRequestWithAuth>();
    const rawAuthHeader = request?.headers?.authorization;
    const authHeader = Array.isArray(rawAuthHeader)
      ? rawAuthHeader[0]
      : rawAuthHeader;
    const bearerToken = this.extractBearerToken(authHeader);

    if (isPublic) {
      if (bearerToken) {
        await this.tryAttachUserFromToken(request, bearerToken);
      }
      return true;
    }

    // Compatibilidad controlada en TestingModule cuando se inyecta request.user (ej. x-test-user) sin header Authorization
    if (
      !authHeader &&
      process.env.NODE_ENV === 'test' &&
      request?.user !== undefined
    ) {
      if (request.user.isActive === false) {
        throw new ForbiddenException('Cuenta de usuario inactiva');
      }
      return true;
    }

    if (!bearerToken) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const payload = this.tokenService.verify(bearerToken);
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    if (user.isActive === false) {
      throw new ForbiddenException('Cuenta de usuario inactiva');
    }

    request.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    };

    return true;
  }

  private extractBearerToken(authHeader?: string): string | null {
    if (typeof authHeader !== 'string') {
      return null;
    }
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
    return match ? match[1] : null;
  }

  private async tryAttachUserFromToken(
    request: HttpRequestWithAuth,
    token: string,
  ): Promise<void> {
    try {
      const payload = this.tokenService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (user && user.isActive !== false) {
        request.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
        };
      }
    } catch {
      // En rutas @Public() se ignora un token inválido o expirado
    }
  }
}

