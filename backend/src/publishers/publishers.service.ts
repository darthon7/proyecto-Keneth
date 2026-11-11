import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publisher } from './entities/publisher.entity.js';
import { CreatePublisherDto } from './dto/create-publisher.dto.js';
import { UpdatePublisherDto } from './dto/update-publisher.dto.js';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
  ) {}

  async create(createPublisherDto: CreatePublisherDto) {
    const publisher = this.publisherRepository.create(createPublisherDto);
    return await this.publisherRepository.save(publisher);
  }

  async findAll() {
    return await this.publisherRepository.find({
      relations: { games: true },
    });
  }

  async findOne(id: number) {
    const publisher = await this.publisherRepository.findOne({
      where: { id },
      relations: { games: true },
    });
    if (!publisher) {
      throw new NotFoundException(`Publisher con ID ${id} no encontrado`);
    }
    return publisher;
  }

  async update(id: number, updatePublisherDto: UpdatePublisherDto) {
    const publisher = await this.findOne(id);
    this.publisherRepository.merge(publisher, updatePublisherDto);
    return await this.publisherRepository.save(publisher);
  }

  async remove(id: number) {
    const publisher = await this.findOne(id);
    return await this.publisherRepository.remove(publisher);
  }
}
