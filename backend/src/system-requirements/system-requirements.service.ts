import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemRequirement } from './entities/system-requirement.entity.js';
import { GamesService } from '../games/games.service.js';
import { CreateSystemRequirementDto } from './dto/create-system-requirement.dto.js';
import { UpdateSystemRequirementDto } from './dto/update-system-requirement.dto.js';

@Injectable()
export class SystemRequirementsService {
  constructor(
    @InjectRepository(SystemRequirement)
    private readonly requirementRepository: Repository<SystemRequirement>,

    private readonly gamesService: GamesService,
  ) {}

  async create(createDto: CreateSystemRequirementDto) {
    const { gameId, ...datos } = createDto;
    const game = await this.gamesService.findByIdRaw(gameId);
    if (!game) {
      throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
    }

    const requirement = this.requirementRepository.create({
      ...datos,
      gameId: game.id,
    });
    const saved = await this.requirementRepository.save(requirement);
    return {
      ...saved,
      game,
    };
  }

  async findAll() {
    const requirements = await this.requirementRepository.find();
    const gameMap = await this.gamesService.findByIdsMap(
      requirements.map((r) => r.gameId),
    );
    return requirements.map((req) => ({
      ...req,
      game: gameMap.get(req.gameId) ?? null,
    }));
  }

  async findOne(id: number) {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
    });
    if (!requirement) {
      throw new NotFoundException(
        `Requisito de sistema con ID ${id} no encontrado`,
      );
    }
    const game = await this.gamesService.findByIdRaw(requirement.gameId);
    return {
      ...requirement,
      game,
    };
  }

  async update(id: number, updateDto: UpdateSystemRequirementDto) {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
    });
    if (!requirement) {
      throw new NotFoundException(
        `Requisito de sistema con ID ${id} no encontrado`,
      );
    }
    const { gameId, ...datos } = updateDto;

    if (gameId) {
      const game = await this.gamesService.findByIdRaw(gameId);
      if (!game) {
        throw new NotFoundException(`El videojuego con ID ${gameId} no existe`);
      }
      requirement.gameId = game.id;
    }

    this.requirementRepository.merge(requirement, datos);
    const saved = await this.requirementRepository.save(requirement);
    const game = await this.gamesService.findByIdRaw(saved.gameId);
    return {
      ...saved,
      game,
    };
  }

  async remove(id: number) {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
    });
    if (!requirement) {
      throw new NotFoundException(
        `Requisito de sistema con ID ${id} no encontrado`,
      );
    }
    const game = await this.gamesService.findByIdRaw(requirement.gameId);
    const removed = await this.requirementRepository.remove(requirement);
    return {
      ...removed,
      game,
    };
  }
}
