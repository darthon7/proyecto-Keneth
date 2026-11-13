import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  hashPassword,
  type SafeUser,
  sanitizeUser,
} from '../auth/index.js';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './entities/user-role.enum.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const normalizedEmail = createUserDto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });
    if (existing) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const hashedPassword = await hashPassword(createUserDto.password);
    const user = this.userRepository.create({
      ...createUserDto,
      email: normalizedEmail,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
    });
    const saved = await this.userRepository.save(user);
    return sanitizeUser(saved);
  }

  async findAll(
    role?: UserRole,
    pagination?: PaginationOptions,
  ): Promise<SafeUser[]> {
    const { take, skip } = normalizePagination(pagination);
    const users = await this.userRepository.find({
      where: role ? { role } : undefined,
      relations: {
        userLibraries: { gameEdition: { game: true } },
        wishlists: { game: true },
        reviews: true,
      },
      take,
      skip,
    });
    return users.map((user) => sanitizeUser(user));
  }

  private async findEntityOrFail(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        userLibraries: { gameEdition: { game: true, platform: true } },
        wishlists: { game: true },
        orders: { items: true },
        reviews: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.findEntityOrFail(id);
    return sanitizeUser(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.findEntityOrFail(id);
    const safeUpdateData: UpdateUserDto = { ...updateUserDto };
    delete (safeUpdateData as Record<string, unknown>).role;

    if (typeof safeUpdateData.email === 'string') {
      const normalizedEmail = safeUpdateData.email.trim().toLowerCase();
      safeUpdateData.email = normalizedEmail;
      if (normalizedEmail !== user.email.toLowerCase()) {
        const existing = await this.userRepository.findOneBy({
          email: normalizedEmail,
        });
        if (existing && existing.id !== id) {
          throw new ConflictException('El correo ya está registrado');
        }
      }
    }

    if (typeof safeUpdateData.password === 'string') {
      safeUpdateData.password = await hashPassword(safeUpdateData.password);
    }
    this.userRepository.merge(user, safeUpdateData);
    const saved = await this.userRepository.save(user);
    return sanitizeUser(saved);
  }

  async updateRole(id: number, role: UserRole): Promise<SafeUser> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    user.role = role;
    const saved = await this.userRepository.save(user);
    return sanitizeUser(saved);
  }

  async remove(id: number): Promise<SafeUser> {
    const user = await this.findEntityOrFail(id);
    const removed = await this.userRepository.remove(user);
    return sanitizeUser(removed);
  }
}
