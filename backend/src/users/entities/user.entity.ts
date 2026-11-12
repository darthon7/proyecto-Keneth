import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity.js';
import { UserLibrary } from '../../user-libraries/entities/user-library.entity.js';
import { Wishlist } from '../../wishlists/entities/wishlist.entity.js';
import { Review } from '../../reviews/entities/review.entity.js';
import { UserRole } from './user-role.enum.js';

export { UserRole };

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 100 })
  username: string;

  @Column({ length: 2, default: 'MX' })
  countryCode: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
    nullable: false,
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Relation<Order[]>;

  @OneToMany(() => UserLibrary, (lib) => lib.user)
  userLibraries: Relation<UserLibrary[]>;

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user)
  wishlists: Relation<Wishlist[]>;

  @OneToMany(() => Review, (review) => review.user)
  reviews: Relation<Review[]>;
}
