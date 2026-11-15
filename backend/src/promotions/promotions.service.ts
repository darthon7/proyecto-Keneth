import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { validateActivationDateRange } from '../common/date-validation.util.js';
import { Promotion } from './entities/promotion.entity.js';
import { CouponRedemption } from './entities/coupon-redemption.entity.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';

export type PromotionWithUsage = Promotion & {
  usageLimitPerUser: number;
  isClaimed: boolean;
};

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,

    @InjectRepository(CouponRedemption)
    private readonly couponRedemptionRepository: Repository<CouponRedemption>,
  ) {}

  private async attachUsageMetadata(
    promotions: Promotion[],
    userId?: number,
  ): Promise<PromotionWithUsage[]> {
    let claimedPromotionIds = new Set<number>();
    if (userId !== undefined && promotions.length > 0) {
      const redemptions = await this.couponRedemptionRepository.find({
        where: { userId },
        select: { promotionId: true },
      });
      claimedPromotionIds = new Set(redemptions.map((r) => r.promotionId));
    }

    return promotions.map((promo) => ({
      ...promo,
      usageLimitPerUser: 1,
      isClaimed: claimedPromotionIds.has(promo.id),
    }));
  }

  async hasUserClaimed(promotionId: number, userId: number): Promise<boolean> {
    return await this.couponRedemptionRepository.exists({
      where: { promotionId, userId },
    });
  }

  async create(createDto: CreatePromotionDto) {
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    validateActivationDateRange({
      startDate,
      endDate,
      requireNotBeforeTodayOnStart: true,
      requireNotBeforeTodayOnEnd: true,
      isActivating: createDto.isActive ?? true,
    });

    const promo = this.promotionRepository.create({
      ...createDto,
      couponCode: createDto.couponCode.trim().toUpperCase(),
      startDate,
      endDate,
    });
    return await this.promotionRepository.save(promo);
  }

  async findAll(userId?: number): Promise<PromotionWithUsage[]> {
    const promotions = await this.promotionRepository.find({
      where: { userId: IsNull() },
      order: { endDate: 'ASC' },
    });
    return await this.attachUsageMetadata(promotions, userId);
  }

  async findForUser(userId: number): Promise<PromotionWithUsage[]> {
    const promotions = await this.promotionRepository.find({
      where: [{ userId: IsNull() }, { userId }],
      order: { endDate: 'ASC' },
    });
    return await this.attachUsageMetadata(promotions, userId);
  }

  async findOne(id: number) {
    const promo = await this.promotionRepository.findOneBy({ id });
    if (!promo) {
      throw new NotFoundException(`Cupón/promoción con ID ${id} no encontrada`);
    }
    return promo;
  }

  async update(id: number, updateDto: UpdatePromotionDto) {
    const promo = await this.findOne(id);
    const { startDate, endDate, couponCode, ...rest } = updateDto;
    const nextStartDate = startDate ? new Date(startDate) : new Date(promo.startDate);
    const nextEndDate = endDate ? new Date(endDate) : new Date(promo.endDate);
    const startChanged =
      startDate !== undefined && nextStartDate.getTime() !== new Date(promo.startDate).getTime();
    const endChanged =
      endDate !== undefined && nextEndDate.getTime() !== new Date(promo.endDate).getTime();
    const effectiveIsActive = updateDto.isActive ?? promo.isActive;

    validateActivationDateRange({
      startDate: nextStartDate,
      endDate: nextEndDate,
      requireNotBeforeTodayOnStart: startChanged,
      requireNotBeforeTodayOnEnd: endChanged,
      isActivating: effectiveIsActive,
    });

    const datosModificados: Partial<Promotion> = { ...rest };
    if (couponCode !== undefined) {
      datosModificados.couponCode = couponCode.trim().toUpperCase();
    }
    if (startDate) {
      datosModificados.startDate = nextStartDate;
    }
    if (endDate) {
      datosModificados.endDate = nextEndDate;
    }

    this.promotionRepository.merge(promo, datosModificados);
    return await this.promotionRepository.save(promo);
  }

  async remove(id: number) {
    const promo = await this.findOne(id);
    return await this.promotionRepository.remove(promo);
  }

  async findByCoupon(couponCode: string, userId?: number) {
    const normalizedCode = couponCode.trim().toUpperCase();
    const now = new Date();
    const whereClauses =
      userId !== undefined
        ? [
            {
              couponCode: normalizedCode,
              isActive: true,
              startDate: LessThanOrEqual(now),
              endDate: MoreThanOrEqual(now),
              userId: IsNull(),
            },
            {
              couponCode: normalizedCode,
              isActive: true,
              startDate: LessThanOrEqual(now),
              endDate: MoreThanOrEqual(now),
              userId,
            },
          ]
        : {
            couponCode: normalizedCode,
            isActive: true,
            startDate: LessThanOrEqual(now),
            endDate: MoreThanOrEqual(now),
            userId: IsNull(),
          };
    const promo = await this.promotionRepository.findOne({
      where: whereClauses,
    });
    if (!promo || !promo.isActive) {
      return null;
    }
    if (new Date(promo.startDate) > now || new Date(promo.endDate) < now) {
      return null;
    }
    return promo;
  }
}
