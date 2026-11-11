import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Game } from '../../games/entities/game.entity.js';

@Entity('wishlists')
@Unique(['user', 'game'])
export class Wishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  notifyOnSale: boolean;

  @CreateDateColumn()
  addedAt: Date;

  @ManyToOne(() => User, (user) => user.wishlists, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: Relation<User>;

  @ManyToOne(() => Game, (game) => game.wishlists, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  game: Relation<Game>;
}
