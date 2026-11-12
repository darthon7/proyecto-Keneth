import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import type { Repository } from 'typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './entities/user-role.enum.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { ROLES_KEY, RolesGuard } from '../common/auth/index.js';

describe('UsersService, DTOs y Roles', () => {
  let service: UsersService;
  let mockRepo: {
    findOneBy: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepo = {
      findOneBy: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data: Partial<User>) => ({ id: 1, ...data })),
      save: vi.fn(async (user: User) => user),
      merge: vi.fn((user: User, dto: Partial<User>) => Object.assign(user, dto)),
      remove: vi.fn(async (user: User) => user),
    };
    service = new UsersService(mockRepo as unknown as Repository<User>);
  });

  it('create asigna explícitamente UserRole.CUSTOMER', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);

    const result = await service.create({
      email: 'nuevo@example.com',
      password: 'Password123',
      username: 'nuevo_usuario',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'nuevo@example.com',
        role: UserRole.CUSTOMER,
      }),
    );
    expect(result.role).toBe(UserRole.CUSTOMER);
  });

  it('create lanza BadRequestException si el correo ya existe', async () => {
    mockRepo.findOneBy.mockResolvedValue({ id: 1, email: 'dup@example.com' });

    await expect(
      service.create({
        email: 'dup@example.com',
        password: 'Password123',
        username: 'dup_user',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('findAll filtra opcionalmente por rol sin consultas adicionales', async () => {
    mockRepo.find.mockResolvedValue([]);

    await service.findAll(UserRole.ADMIN);
    expect(mockRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: UserRole.ADMIN },
      }),
    );

    await service.findAll();
    expect(mockRepo.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: undefined,
      }),
    );
  });

  it('update ignora explícitamente role si se envía programáticamente', async () => {
    const existingUser = {
      id: 5,
      email: 'customer@example.com',
      username: 'old_name',
      role: UserRole.CUSTOMER,
    } as User;
    mockRepo.findOne.mockResolvedValue(existingUser);

    const updated = await service.update(5, {
      username: 'new_name',
      role: UserRole.ADMIN,
    } as unknown as UpdateUserDto);

    expect(mockRepo.merge).toHaveBeenCalledWith(existingUser, {
      username: 'new_name',
    });
    expect(updated.role).toBe(UserRole.CUSTOMER);
    expect(updated.username).toBe('new_name');
  });

  it('updateRole actualiza el rol del usuario existente', async () => {
    const existingUser = {
      id: 7,
      email: 'user@example.com',
      role: UserRole.CUSTOMER,
    } as User;
    mockRepo.findOneBy.mockResolvedValue(existingUser);

    const updated = await service.updateRole(7, UserRole.ADMIN);
    expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 7 });
    expect(updated.role).toBe(UserRole.ADMIN);
    expect(mockRepo.save).toHaveBeenCalledWith(existingUser);
  });

  it('updateRole lanza NotFoundException si el usuario no existe', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);

    await expect(service.updateRole(999, UserRole.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('UsersController.updateRole posee @Roles(UserRole.ADMIN) y @UseGuards(RolesGuard)', () => {
    const reflector = new Reflector();
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      UsersController.prototype.updateRole,
    );
    const guards = reflector.get<unknown[]>(
      GUARDS_METADATA,
      UsersController.prototype.updateRole,
    );

    expect(roles).toEqual([UserRole.ADMIN]);
    expect(guards).toContain(RolesGuard);
  });

  it('endpoints existentes de UsersController permanecen sin RolesGuard para compatibilidad', () => {
    const reflector = new Reflector();
    const publicHandlers = [
      UsersController.prototype.create,
      UsersController.prototype.findAll,
      UsersController.prototype.findOne,
      UsersController.prototype.update,
      UsersController.prototype.remove,
    ];

    for (const handler of publicHandlers) {
      const guards = reflector.get<unknown[]>(GUARDS_METADATA, handler);
      expect(guards).toBeUndefined();
    }
  });

  describe('Validación de DTOs con ValidationPipe', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    it('CreateUserDto rechaza el envío del campo role', async () => {
      await expect(
        pipe.transform(
          {
            email: 'hacker@example.com',
            password: 'Password123',
            username: 'hacker',
            role: UserRole.ADMIN,
          },
          { type: 'body', metatype: CreateUserDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('UpdateUserDto rechaza el envío del campo role', async () => {
      await expect(
        pipe.transform(
          {
            username: 'updated_name',
            role: UserRole.ADMIN,
          },
          { type: 'body', metatype: UpdateUserDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('UpdateUserRoleDto acepta roles válidos y rechaza valores inválidos', async () => {
      const valid = await pipe.transform(
        { role: UserRole.ADMIN },
        { type: 'body', metatype: UpdateUserRoleDto },
      );
      expect(valid.role).toBe(UserRole.ADMIN);

      await expect(
        pipe.transform(
          { role: 'SUPERADMIN' },
          { type: 'body', metatype: UpdateUserRoleDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
