import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Genre } from './entities/genre.entity.js';
import { GamesService } from '../games/games.service.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { UpdateGenreDto } from './dto/update-genre.dto.js';

@Injectable()
export class GenresService {
  private readonly logger = new Logger(GenresService.name);

  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,

    private readonly gamesService: GamesService,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(createGenreDto: CreateGenreDto) {
    const genre = this.genreRepository.create(createGenreDto);
    return await this.genreRepository.save(genre);
  }

  async findAll() {
    const genres = await this.genreRepository.find();
    const gamesMap = await this.gamesService.findByGenreIds(
      genres.map((g) => g.id),
    );
    return genres.map((genre) => ({
      ...genre,
      games: gamesMap.get(genre.id) ?? [],
    }));
  }

  private async findEntityOrFail(id: number): Promise<Genre> {
    const genre = await this.genreRepository.findOne({
      where: { id },
    });
    if (!genre) {
      throw new NotFoundException(`Género con ID ${id} no encontrado`);
    }
    return genre;
  }

  async findOne(id: number) {
    const genre = await this.findEntityOrFail(id);
    const gamesMap = await this.gamesService.findByGenreIds([id]);
    return {
      ...genre,
      games: gamesMap.get(id) ?? [],
    };
  }

  async update(id: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.findEntityOrFail(id);
    this.genreRepository.merge(genre, updateGenreDto);
    const saved = await this.genreRepository.save(genre);
    const gamesMap = await this.gamesService.findByGenreIds([id]);
    return {
      ...saved,
      games: gamesMap.get(id) ?? [],
    };
  }

  async remove(id: number) {
    const genre = await this.findEntityOrFail(id);
    const affectedGames =
      (await this.gamesService.findByGenreIds([id])).get(id) ?? [];
    const affectedGameIds = affectedGames.map((g) => g.id);
    const removedSnapshot = { ...genre, games: affectedGames };
    let mongoUpdated = false;

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.remove(Genre, genre);
        if (affectedGameIds.length > 0) {
          await this.gamesService.removeGenreFromGames(id);
          mongoUpdated = true;
        }
      });
    } catch (error) {
      if (mongoUpdated && affectedGameIds.length > 0) {
        try {
          await this.gamesService.addGenreToGames(id, affectedGameIds);
        } catch (compensationError) {
          this.logger.error(
            `Error al compensar genreId ${id} en MongoDB tras fallo en MySQL`,
            compensationError,
          );
        }
      }
      throw error;
    }

    return removedSnapshot;
  }
}
