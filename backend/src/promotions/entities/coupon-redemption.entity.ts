import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Promotion } from './promotion.entity.js';

@Entity('coupon_redemptions')
@Unique(['userId', 'promotionId'])
export class CouponRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  promotionId: number;

  @Column({ type: 'int', nullable: true })
  orderId: number | null;

  @CreateDateColumn()
  claimedAt: Date;

  @ManyToOne(() => Promotion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotionId' })
  promotion?: Promotion;
}
