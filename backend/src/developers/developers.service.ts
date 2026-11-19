import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Developer } from './entities/developer.entity.js';
import { GamesService } from '../games/games.service.js';
import { CreateDeveloperDto } from './dto/create-developer.dto.js';
import { UpdateDeveloperDto } from './dto/update-developer.dto.js';

@Injectable()
export class DevelopersService {
  constructor(
    @InjectRepository(Developer)
    private readonly developerRepository: Repository<Developer>,

    private readonly gamesService: GamesService,
  ) {}

  async create(createDeveloperDto: CreateDeveloperDto) {
    const developer = this.developerRepository.create(createDeveloperDto);
    return await this.developerRepository.save(developer);
  }

  async findAll() {
    const developers = await this.developerRepository.find();
    const gamesMap = await this.gamesService.findByDeveloperIds(
      developers.map((d) => d.id),
    );
    return developers.map((developer) => ({
      ...developer,
      games: gamesMap.get(developer.id) ?? [],
    }));
  }

  private async findEntityOrFail(id: number): Promise<Developer> {
    const developer = await this.developerRepository.findOne({
      where: { id },
    });
    if (!developer) {
      throw new NotFoundException(`Developer con ID ${id} no encontrado`);
    }
    return developer;
  }

  async findOne(id: number) {
    const developer = await this.findEntityOrFail(id);
    const gamesMap = await this.gamesService.findByDeveloperIds([id]);
    return {
      ...developer,
      games: gamesMap.get(id) ?? [],
    };
  }

  async update(id: number, updateDeveloperDto: UpdateDeveloperDto) {
    const developer = await this.findEntityOrFail(id);
    this.developerRepository.merge(developer, updateDeveloperDto);
    const saved = await this.developerRepository.save(developer);
    const gamesMap = await this.gamesService.findByDeveloperIds([id]);
    return {
      ...saved,
      games: gamesMap.get(id) ?? [],
    };
  }

  async remove(id: number) {
    const developer = await this.findEntityOrFail(id);
    const gamesCount = await this.gamesService.countByDeveloperId(id);
    if (gamesCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el developer con ID ${id} porque tiene ${gamesCount} videojuego(s) asociado(s)`,
      );
    }
    const removed = await this.developerRepository.remove(developer);
    return {
      ...removed,
      games: [],
    };
  }
}
