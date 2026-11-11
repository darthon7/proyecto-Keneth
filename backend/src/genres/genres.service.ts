import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genre } from './entities/genre.entity.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { UpdateGenreDto } from './dto/update-genre.dto.js';

@Injectable()
export class GenresService {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async create(createGenreDto: CreateGenreDto) {
    const genre = this.genreRepository.create(createGenreDto);
    return await this.genreRepository.save(genre);
  }

  async findAll() {
    return await this.genreRepository.find({
      relations: { games: true },
    });
  }

  async findOne(id: number) {
    const genre = await this.genreRepository.findOne({
      where: { id },
      relations: { games: true },
    });
    if (!genre) {
      throw new NotFoundException(`Género con ID ${id} no encontrado`);
    }
    return genre;
  }

  async update(id: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.findOne(id);
    this.genreRepository.merge(genre, updateGenreDto);
    return await this.genreRepository.save(genre);
  }

  async remove(id: number) {
    const genre = await this.findOne(id);
    return await this.genreRepository.remove(genre);
  }
}
