import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('wishlists')
@Unique(['user', 'gameId'])
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

  @Index()
  @Column({ type: 'int' })
  gameId: number;
}
