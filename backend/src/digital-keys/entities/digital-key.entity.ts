import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { GameEdition } from '../../game-editions/entities/game-edition.entity.js';

export enum KeyStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ASSIGNED = 'ASSIGNED',
  REVOKED = 'REVOKED',
}

@Entity('digital_keys')
export class DigitalKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  code: string;

  @Column({ length: 64, unique: true })
  codeHash: string;

  @Column({
    type: 'enum',
    enum: KeyStatus,
    default: KeyStatus.AVAILABLE,
  })
  status: KeyStatus;

  @Column({ length: 50, nullable: true })
  batchId: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => GameEdition, (edition) => edition.digitalKeys, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  gameEdition: Relation<GameEdition>;
}
