import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(createUserDto: CreateUserDto) {
    const existing = await this.userRepository.findOneBy({
      email: createUserDto.email,
    });
    if (existing) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      role: UserRole.CUSTOMER,
    });
    return await this.userRepository.save(user);
  }

  async findAll(role?: UserRole) {
    return await this.userRepository.find({
      where: role ? { role } : undefined,
      relations: {
        userLibraries: { gameEdition: { game: true } },
        wishlists: { game: true },
        reviews: true,
      },
    });
  }

  async findOne(id: number) {
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

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    const safeUpdateData: UpdateUserDto = { ...updateUserDto };
    delete (safeUpdateData as Record<string, unknown>).role;
    this.userRepository.merge(user, safeUpdateData);
    return await this.userRepository.save(user);
  }

  async updateRole(id: number, role: UserRole) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    user.role = role;
    return await this.userRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    return await this.userRepository.remove(user);
  }
}
