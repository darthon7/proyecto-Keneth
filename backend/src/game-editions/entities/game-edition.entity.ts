import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { Platform } from '../../platforms/entities/platform.entity.js';
import { DigitalKey } from '../../digital-keys/entities/digital-key.entity.js';
import { OrderItem } from '../../orders/entities/order-item.entity.js';
import { UserLibrary } from '../../user-libraries/entities/user-library.entity.js';

export enum EditionFormat {
  DIGITAL = 'DIGITAL',
}

@Entity('game_editions')
@Unique(['gameId', 'platform', 'editionName', 'format'])
export class GameEdition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, default: 'Standard Edition' })
  editionName: string;

  @Column({
    type: 'enum',
    enum: EditionFormat,
    default: EditionFormat.DIGITAL,
  })
  format: EditionFormat;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  basePrice: number;

  @Column({ default: false })
  isDlc: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'int' })
  gameId: number;

  @ManyToOne(() => Platform, (platform) => platform.editions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  platform: Relation<Platform>;

  @OneToMany(() => DigitalKey, (key) => key.gameEdition)
  digitalKeys: Relation<DigitalKey[]>;

  @OneToMany(() => OrderItem, (item) => item.gameEdition)
  orderItems: Relation<OrderItem[]>;

  @OneToMany(() => UserLibrary, (lib) => lib.gameEdition)
  userLibraries: Relation<UserLibrary[]>;
}
