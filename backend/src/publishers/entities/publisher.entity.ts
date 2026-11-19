import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('publishers')
export class Publisher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 255, nullable: true })
  websiteUrl: string;

  @Column({ length: 100, nullable: true })
  supportEmail: string;

  @Column({ length: 2, nullable: true })
  country: string;
}
