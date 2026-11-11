import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { GameEdition } from '../../game-editions/entities/game-edition.entity.js';

@Entity('platforms')
export class Platform {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ length: 255, nullable: true })
  iconUrl: string;

  @OneToMany(() => GameEdition, (edition) => edition.platform)
  editions: Relation<GameEdition[]>;
}
