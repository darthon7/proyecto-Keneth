import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLibrary } from './entities/user-library.entity.js';
import { User } from '../users/entities/user.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { CreateUserLibraryDto } from './dto/create-user-library.dto.js';
import { UpdateUserLibraryDto } from './dto/update-user-library.dto.js';

@Injectable()
export class UserLibrariesService {
  constructor(
    @InjectRepository(UserLibrary)
    private readonly libraryRepository: Repository<UserLibrary>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createDto: CreateUserLibraryDto) {
    const { userId, gameEditionId, orderId, isRevoked } = createDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const edition = await this.editionRepository.findOneBy({
      id: gameEditionId,
    });
    if (!edition) {
      throw new NotFoundException(`Edición con ID ${gameEditionId} no encontrada`);
    }

    let order: Order | null = null;
    if (orderId) {
      order = await this.orderRepository.findOneBy({ id: orderId });
    }

    const entry = this.libraryRepository.create({
      user,
      gameEdition: edition,
      order: order ?? undefined,
      isRevoked: isRevoked ?? false,
    });

    return await this.libraryRepository.save(entry);
  }

  async findAll() {
    return await this.libraryRepository.find({
      relations: {
        user: true,
        gameEdition: { game: true, platform: true },
        order: true,
      },
    });
  }

  async findOne(id: number) {
    const entry = await this.libraryRepository.findOne({
      where: { id },
      relations: {
        user: true,
        gameEdition: { game: true, platform: true },
        order: true,
      },
    });
    if (!entry) {
      throw new NotFoundException(`Registro de biblioteca ${id} no encontrado`);
    }
    return entry;
  }

  async findByUser(userId: number) {
    return await this.libraryRepository.find({
      where: { user: { id: userId }, isRevoked: false },
      relations: {
        gameEdition: { game: true, platform: true },
      },
    });
  }

  async update(id: number, updateDto: UpdateUserLibraryDto) {
    const entry = await this.findOne(id);
    this.libraryRepository.merge(entry, updateDto);
    return await this.libraryRepository.save(entry);
  }

  async remove(id: number) {
    const entry = await this.findOne(id);
    return await this.libraryRepository.remove(entry);
  }
}
