import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Developer } from './entities/developer.entity.js';
import { CreateDeveloperDto } from './dto/create-developer.dto.js';
import { UpdateDeveloperDto } from './dto/update-developer.dto.js';

@Injectable()
export class DevelopersService {
  constructor(
    @InjectRepository(Developer)
    private readonly developerRepository: Repository<Developer>,
  ) {}

  async create(createDeveloperDto: CreateDeveloperDto) {
    const developer = this.developerRepository.create(createDeveloperDto);
    return await this.developerRepository.save(developer);
  }

  async findAll() {
    return await this.developerRepository.find({
      relations: { games: true },
    });
  }

  async findOne(id: number) {
    const developer = await this.developerRepository.findOne({
      where: { id },
      relations: { games: true },
    });
    if (!developer) {
      throw new NotFoundException(`Developer con ID ${id} no encontrado`);
    }
    return developer;
  }

  async update(id: number, updateDeveloperDto: UpdateDeveloperDto) {
    const developer = await this.findOne(id);
    this.developerRepository.merge(developer, updateDeveloperDto);
    return await this.developerRepository.save(developer);
  }

  async remove(id: number) {
    const developer = await this.findOne(id);
    return await this.developerRepository.remove(developer);
  }
}
