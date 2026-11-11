import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Order } from './order.entity.js';
import { GameEdition } from '../../game-editions/entities/game-edition.entity.js';
import { DigitalKey } from '../../digital-keys/entities/digital-key.entity.js';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  unitPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  discountApplied: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  subtotal: number;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  order: Relation<Order>;

  @ManyToOne(() => GameEdition, (edition) => edition.orderItems, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  gameEdition: Relation<GameEdition>;

  @ManyToOne(() => DigitalKey, { nullable: true, onDelete: 'SET NULL' })
  digitalKey: Relation<DigitalKey>;
}
