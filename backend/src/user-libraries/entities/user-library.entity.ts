import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { GameEdition } from '../../game-editions/entities/game-edition.entity.js';
import { Order } from '../../orders/entities/order.entity.js';

@Entity('user_libraries')
export class UserLibrary {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  acquiredAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @ManyToOne(() => User, (user) => user.userLibraries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: Relation<User>;

  @ManyToOne(() => GameEdition, (edition) => edition.userLibraries, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  gameEdition: Relation<GameEdition>;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  order: Relation<Order>;
}
