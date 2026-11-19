import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publisher } from './entities/publisher.entity.js';
import { GamesService } from '../games/games.service.js';
import { CreatePublisherDto } from './dto/create-publisher.dto.js';
import { UpdatePublisherDto } from './dto/update-publisher.dto.js';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,

    private readonly gamesService: GamesService,
  ) {}

  async create(createPublisherDto: CreatePublisherDto) {
    const publisher = this.publisherRepository.create(createPublisherDto);
    return await this.publisherRepository.save(publisher);
  }

  async findAll() {
    const publishers = await this.publisherRepository.find();
    const gamesMap = await this.gamesService.findByPublisherIds(
      publishers.map((p) => p.id),
    );
    return publishers.map((publisher) => ({
      ...publisher,
      games: gamesMap.get(publisher.id) ?? [],
    }));
  }

  private async findEntityOrFail(id: number): Promise<Publisher> {
    const publisher = await this.publisherRepository.findOne({
      where: { id },
    });
    if (!publisher) {
      throw new NotFoundException(`Publisher con ID ${id} no encontrado`);
    }
    return publisher;
  }

  async findOne(id: number) {
    const publisher = await this.findEntityOrFail(id);
    const gamesMap = await this.gamesService.findByPublisherIds([id]);
    return {
      ...publisher,
      games: gamesMap.get(id) ?? [],
    };
  }

  async update(id: number, updatePublisherDto: UpdatePublisherDto) {
    const publisher = await this.findEntityOrFail(id);
    this.publisherRepository.merge(publisher, updatePublisherDto);
    const saved = await this.publisherRepository.save(publisher);
    const gamesMap = await this.gamesService.findByPublisherIds([id]);
    return {
      ...saved,
      games: gamesMap.get(id) ?? [],
    };
  }

  async remove(id: number) {
    const publisher = await this.findEntityOrFail(id);
    const gamesCount = await this.gamesService.countByPublisherId(id);
    if (gamesCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el publisher con ID ${id} porque tiene ${gamesCount} videojuego(s) asociado(s)`,
      );
    }
    const removed = await this.publisherRepository.remove(publisher);
    return {
      ...removed,
      games: [],
    };
  }
}
