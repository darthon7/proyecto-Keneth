import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from './entities/platform.entity.js';
import { CreatePlatformDto } from './dto/create-platform.dto.js';
import { UpdatePlatformDto } from './dto/update-platform.dto.js';

@Injectable()
export class PlatformsService {
  constructor(
    @InjectRepository(Platform)
    private readonly platformRepository: Repository<Platform>,
  ) {}

  async create(createPlatformDto: CreatePlatformDto) {
    const platform = this.platformRepository.create(createPlatformDto);
    return await this.platformRepository.save(platform);
  }

  async findAll() {
    return await this.platformRepository.find({
      relations: { editions: true },
    });
  }

  async findOne(id: number) {
    const platform = await this.platformRepository.findOne({
      where: { id },
      relations: { editions: true },
    });
    if (!platform) {
      throw new NotFoundException(`Plataforma con ID ${id} no encontrada`);
    }
    return platform;
  }

  async update(id: number, updatePlatformDto: UpdatePlatformDto) {
    const platform = await this.findOne(id);
    this.platformRepository.merge(platform, updatePlatformDto);
    return await this.platformRepository.save(platform);
  }

  async remove(id: number) {
    const platform = await this.findOne(id);
    return await this.platformRepository.remove(platform);
  }
}
