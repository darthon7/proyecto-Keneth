import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Game } from '../../games/entities/game.entity.js';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rating: number;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  isVerifiedPurchase: boolean;

  @Column({ type: 'int', default: 0 })
  helpfulCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.reviews, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: Relation<User>;

  @ManyToOne(() => Game, (game) => game.reviews, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  game: Relation<Game>;
}
