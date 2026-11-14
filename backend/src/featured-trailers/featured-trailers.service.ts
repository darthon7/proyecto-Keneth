import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeaturedTrailer } from './entities/featured-trailer.entity.js';
import { UpsertFeaturedTrailerDto } from './dto/upsert-featured-trailer.dto.js';

@Injectable()
export class FeaturedTrailersService {
  constructor(
    @InjectRepository(FeaturedTrailer)
    private readonly trailerRepository: Repository<FeaturedTrailer>,
  ) {}

  private assertValidSlot(slot: number) {
    if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
      throw new BadRequestException('El espacio de tráiler debe ser 1, 2 o 3.');
    }
  }

  async findAll() {
    return await this.trailerRepository.find({
      order: { slot: 'ASC' },
    });
  }

  async upsertSlot(slot: number, dto: UpsertFeaturedTrailerDto) {
    this.assertValidSlot(slot);
    const cleanDescription = dto.description?.trim() || null;
    let trailer = await this.trailerRepository.findOne({ where: { slot } });
    if (!trailer) {
      trailer = this.trailerRepository.create({
        slot,
        title: dto.title.trim(),
        imageUrl: dto.imageUrl.trim(),
        youtubeUrl: dto.youtubeUrl.trim(),
        description: cleanDescription,
      });
    } else {
      trailer.title = dto.title.trim();
      trailer.imageUrl = dto.imageUrl.trim();
      trailer.youtubeUrl = dto.youtubeUrl.trim();
      trailer.description = cleanDescription;
    }
    return await this.trailerRepository.save(trailer);
  }

  async removeSlot(slot: number) {
    this.assertValidSlot(slot);
    const existing = await this.trailerRepository.findOne({ where: { slot } });
    if (!existing) {
      return { deleted: false, slot };
    }
    await this.trailerRepository.remove(existing);
    return { deleted: true, slot };
  }
}
