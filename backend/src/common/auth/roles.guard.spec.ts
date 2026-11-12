import { describe, it, expect, vi } from 'vitest';
import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY, Roles } from './roles.decorator.js';
import { UserRole } from '../../users/entities/user-role.enum.js';

function createMockExecutionContext(user?: {
  role?: UserRole;
  isActive?: boolean;
}): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard & @Roles decorator', () => {
  it('el decorador @Roles asigna la metadata ROLES_KEY correctamente', () => {
    class TestController {
      @Roles(UserRole.ADMIN)
      adminOnly() {}
    }

    const reflector = new Reflector();
    const metadata = reflector.get<UserRole[]>(
      ROLES_KEY,
      TestController.prototype.adminOnly,
    );
    expect(metadata).toEqual([UserRole.ADMIN]);
  });

  it('retorna true cuando la ruta no tiene metadata @Roles', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createMockExecutionContext())).toBe(true);
  });

  it('lanza ForbiddenException (fail-closed) cuando @Roles está vacío', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        createMockExecutionContext({ role: UserRole.ADMIN, isActive: true }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('lanza UnauthorizedException si requiere roles y request.user no existe', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createMockExecutionContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('lanza ForbiddenException si user.isActive es false', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        createMockExecutionContext({ role: UserRole.ADMIN, isActive: false }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si request.user.role no está en requiredRoles', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        createMockExecutionContext({ role: UserRole.CUSTOMER, isActive: true }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si request.user no tiene role definido', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(createMockExecutionContext({ isActive: true })),
    ).toThrow(ForbiddenException);
  });

  it('retorna true si request.user está activo y su rol coincide con los requeridos', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createMockExecutionContext({ role: UserRole.ADMIN, isActive: true }),
      ),
    ).toBe(true);
  });
});

describe('RolesGuard con Reflector real (precedencia y herencia de metadatos)', () => {
  const createContextForHandler = (
    targetClass: new () => unknown,
    handler: (...args: unknown[]) => unknown,
    user?: { role?: UserRole; isActive?: boolean },
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => targetClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  @Roles(UserRole.CUSTOMER)
  class ClassCustomerOverrideController {
    @Roles(UserRole.ADMIN)
    adminMethod() {}

    inheritedMethod() {}

    @Roles()
    emptyMethod() {}
  }

  @Roles(UserRole.ADMIN)
  class ClassAdminOverrideController {
    @Roles(UserRole.CUSTOMER)
    customerMethod() {}
  }

  class PublicController {
    openMethod() {}

    @Roles(UserRole.ADMIN, UserRole.CUSTOMER)
    multiRoleMethod() {}
  }

  const guard = new RolesGuard(new Reflector());

  it('el decorador @Roles en el método tiene precedencia sobre @Roles en la clase (ADMIN sobre CUSTOMER)', () => {
    const adminCtx = createContextForHandler(
      ClassCustomerOverrideController,
      ClassCustomerOverrideController.prototype.adminMethod,
      { role: UserRole.ADMIN, isActive: true },
    );
    const customerCtx = createContextForHandler(
      ClassCustomerOverrideController,
      ClassCustomerOverrideController.prototype.adminMethod,
      { role: UserRole.CUSTOMER, isActive: true },
    );

    expect(guard.canActivate(adminCtx)).toBe(true);
    expect(() => guard.canActivate(customerCtx)).toThrow(ForbiddenException);
  });

  it('el decorador @Roles en el método tiene precedencia sobre @Roles en la clase (CUSTOMER sobre ADMIN)', () => {
    const customerCtx = createContextForHandler(
      ClassAdminOverrideController,
      ClassAdminOverrideController.prototype.customerMethod,
      { role: UserRole.CUSTOMER, isActive: true },
    );
    const adminCtx = createContextForHandler(
      ClassAdminOverrideController,
      ClassAdminOverrideController.prototype.customerMethod,
      { role: UserRole.ADMIN, isActive: true },
    );

    expect(guard.canActivate(customerCtx)).toBe(true);
    expect(() => guard.canActivate(adminCtx)).toThrow(ForbiddenException);
  });

  it('hereda @Roles de la clase cuando el método no tiene @Roles propio', () => {
    const customerCtx = createContextForHandler(
      ClassCustomerOverrideController,
      ClassCustomerOverrideController.prototype.inheritedMethod,
      { role: UserRole.CUSTOMER, isActive: true },
    );
    const adminCtx = createContextForHandler(
      ClassCustomerOverrideController,
      ClassCustomerOverrideController.prototype.inheritedMethod,
      { role: UserRole.ADMIN, isActive: true },
    );

    expect(guard.canActivate(customerCtx)).toBe(true);
    expect(() => guard.canActivate(adminCtx)).toThrow(ForbiddenException);
  });

  it('@Roles() vacío en el método sobreescribe la clase y deniega incluso a ADMIN (fail-closed)', () => {
    const adminCtx = createContextForHandler(
      ClassCustomerOverrideController,
      ClassCustomerOverrideController.prototype.emptyMethod,
      { role: UserRole.ADMIN, isActive: true },
    );

    expect(() => guard.canActivate(adminCtx)).toThrow(ForbiddenException);
  });

  it('permite acceso sin usuario cuando ni clase ni método tienen @Roles', () => {
    const publicCtx = createContextForHandler(
      PublicController,
      PublicController.prototype.openMethod,
      undefined,
    );

    expect(guard.canActivate(publicCtx)).toBe(true);
  });

  it('acepta múltiples roles en @Roles cuando el usuario está activo y coincide alguno', () => {
    const adminCtx = createContextForHandler(
      PublicController,
      PublicController.prototype.multiRoleMethod,
      { role: UserRole.ADMIN, isActive: true },
    );
    const customerCtx = createContextForHandler(
      PublicController,
      PublicController.prototype.multiRoleMethod,
      { role: UserRole.CUSTOMER, isActive: true },
    );
    const inactiveCtx = createContextForHandler(
      PublicController,
      PublicController.prototype.multiRoleMethod,
      { role: UserRole.CUSTOMER, isActive: false },
    );

    expect(guard.canActivate(adminCtx)).toBe(true);
    expect(guard.canActivate(customerCtx)).toBe(true);
    expect(() => guard.canActivate(inactiveCtx)).toThrow(ForbiddenException);
  });
});
