import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemRequirement } from './entities/system-requirement.entity.js';
import { Game } from '../games/entities/game.entity.js';
import { CreateSystemRequirementDto } from './dto/create-system-requirement.dto.js';
import { UpdateSystemRequirementDto } from './dto/update-system-requirement.dto.js';

@Injectable()
export class SystemRequirementsService {
  constructor(
    @InjectRepository(SystemRequirement)
    private readonly requirementRepository: Repository<SystemRequirement>,

    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  async create(createDto: CreateSystemRequirementDto) {
    const { gameId, ...datos } = createDto;
    const game = await this.gameRepository.findOneBy({ id: gameId });
    if (!game) {
      throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
    }

    const requirement = this.requirementRepository.create({
      ...datos,
      game,
    });
    return await this.requirementRepository.save(requirement);
  }

  async findAll() {
    return await this.requirementRepository.find({
      relations: { game: true },
    });
  }

  async findOne(id: number) {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
      relations: { game: true },
    });
    if (!requirement) {
      throw new NotFoundException(`Requisito de sistema con ID ${id} no encontrado`);
    }
    return requirement;
  }

  async update(id: number, updateDto: UpdateSystemRequirementDto) {
    const requirement = await this.findOne(id);
    const { gameId, ...datos } = updateDto;

    if (gameId) {
      const game = await this.gameRepository.findOneBy({ id: gameId });
      if (!game) {
        throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
      }
      requirement.game = game;
    }

    this.requirementRepository.merge(requirement, datos);
    return await this.requirementRepository.save(requirement);
  }

  async remove(id: number) {
    const requirement = await this.findOne(id);
    return await this.requirementRepository.remove(requirement);
  }
}
