import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  async create(createDto: CreatePromotionDto) {
    const promo = this.promotionRepository.create({
      ...createDto,
      startDate: new Date(createDto.startDate),
      endDate: new Date(createDto.endDate),
    });
    return await this.promotionRepository.save(promo);
  }

  async findAll() {
    return await this.promotionRepository.find();
  }

  async findOne(id: number) {
    const promo = await this.promotionRepository.findOneBy({ id });
    if (!promo) {
      throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
    }
    return promo;
  }

  async update(id: number, updateDto: UpdatePromotionDto) {
    const promo = await this.findOne(id);
    const { startDate, endDate, ...rest } = updateDto;
    const datosModificados: Partial<Promotion> = { ...rest };
    if (startDate) {
      datosModificados.startDate = new Date(startDate);
    }
    if (endDate) {
      datosModificados.endDate = new Date(endDate);
    }

    this.promotionRepository.merge(promo, datosModificados);
    return await this.promotionRepository.save(promo);
  }

  async remove(id: number) {
    const promo = await this.findOne(id);
    return await this.promotionRepository.remove(promo);
  }

  async findByCoupon(couponCode: string) {
    return await this.promotionRepository.findOne({
      where: { couponCode, isActive: true },
    });
  }
}
