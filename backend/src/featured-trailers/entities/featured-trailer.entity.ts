import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('featured_trailers')
export class FeaturedTrailer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  slot: number;

  @Column({ length: 180 })
  title: string;

  @Column({ length: 500 })
  imageUrl: string;

  @Column({ length: 300 })
  youtubeUrl: string;

  @Column({ type: 'varchar', length: 600, nullable: true })
  description: string | null;
}
