import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user-role.enum.js';
import { ROLES_KEY } from './roles.decorator.js';

interface AuthenticatedRequest {
  user?: {
    role?: UserRole;
    isActive?: boolean;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    if (requiredRoles.length === 0) {
      throw new ForbiddenException(
        'Acceso denegado: no hay roles autorizados configurados',
      );
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request?.user;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    if (user.isActive === false) {
      throw new ForbiddenException('Cuenta de usuario inactiva');
    }

    if (!user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }

    return true;
  }
}
