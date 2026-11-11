import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Game } from '../../games/entities/game.entity.js';

@Entity('developers')
export class Developer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 2, nullable: true })
  country: string;

  @Column({ type: 'int', nullable: true })
  foundedYear: number;

  @OneToMany(() => Game, (game) => game.developer)
  games: Relation<Game[]>;
}
