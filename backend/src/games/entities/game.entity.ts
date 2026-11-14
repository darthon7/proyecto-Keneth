import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Publisher } from '../../publishers/entities/publisher.entity.js';
import { Developer } from '../../developers/entities/developer.entity.js';
import { Genre } from '../../genres/entities/genre.entity.js';
import { SystemRequirement } from '../../system-requirements/entities/system-requirement.entity.js';
import { GameEdition } from '../../game-editions/entities/game-edition.entity.js';
import { Review } from '../../reviews/entities/review.entity.js';
import { Wishlist } from '../../wishlists/entities/wishlist.entity.js';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 220, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  synopsis: string;

  @Column({ length: 10, default: 'E' })
  esrbRating: string;

  @Column({ type: 'date' })
  releaseDate: string;

  @Column({ length: 255, nullable: true })
  coverImageUrl: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  discountCampaignName: string | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value ?? 0,
      from: (value: string | number | null) => Number(value ?? 0),
    },
  })
  discountPercentage: number;

  @Column({ type: 'timestamp', nullable: true })
  discountStartDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  discountEndDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Publisher, (publisher) => publisher.games, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  publisher: Relation<Publisher>;

  @ManyToOne(() => Developer, (developer) => developer.games, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  developer: Relation<Developer>;

  @ManyToMany(() => Genre, (genre) => genre.games)
  @JoinTable({
    name: 'game_genres',
    joinColumn: { name: 'game_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
  })
  genres: Relation<Genre[]>;

  @OneToMany(() => SystemRequirement, (req) => req.game)
  systemRequirements: Relation<SystemRequirement[]>;

  @OneToMany(() => GameEdition, (edition) => edition.game)
  editions: Relation<GameEdition[]>;

  @OneToMany(() => Review, (review) => review.game)
  reviews: Relation<Review[]>;

  @OneToMany(() => Wishlist, (wishlist) => wishlist.game)
  wishlists: Relation<Wishlist[]>;
}
