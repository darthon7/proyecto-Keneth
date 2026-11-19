import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum RequirementTier {
  MINIMUM = 'MINIMUM',
  RECOMMENDED = 'RECOMMENDED',
  ULTRA_RAYTRACING = 'ULTRA_RAYTRACING',
}

@Entity('system_requirements')
export class SystemRequirement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: RequirementTier,
    default: RequirementTier.MINIMUM,
  })
  tier: RequirementTier;

  @Column({ length: 100 })
  os: string;

  @Column({ length: 150 })
  processor: string;

  @Column({ type: 'int' })
  ramGb: number;

  @Column({ length: 150 })
  graphicsCard: string;

  @Column({ type: 'int' })
  storageGb: number;

  @Column({ length: 50, nullable: true })
  directxVersion: string;

  @Index()
  @Column({ type: 'int' })
  gameId: number;
}
