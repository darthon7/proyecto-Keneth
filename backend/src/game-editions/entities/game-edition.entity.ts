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
import { Game } from '../../games/entities/game.entity.js';
import { Platform } from '../../platforms/entities/platform.entity.js';
import { DigitalKey } from '../../digital-keys/entities/digital-key.entity.js';
import { OrderItem } from '../../orders/entities/order-item.entity.js';
import { UserLibrary } from '../../user-libraries/entities/user-library.entity.js';

export enum EditionFormat {
  DIGITAL = 'DIGITAL',
  PHYSICAL = 'PHYSICAL',
}

@Entity('game_editions')
@Unique(['game', 'platform', 'editionName', 'format'])
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

  @Column({ type: 'int', default: 0 })
  stockPhysical: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Game, (game) => game.editions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  game: Relation<Game>;

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
