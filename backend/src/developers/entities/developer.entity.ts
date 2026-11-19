import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImagenUrl: string;
}
