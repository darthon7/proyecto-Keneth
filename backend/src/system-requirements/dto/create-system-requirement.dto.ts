import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { RequirementTier } from '../entities/system-requirement.entity.js';

export class CreateSystemRequirementDto {
  @IsEnum(RequirementTier)
  tier: RequirementTier;

  @IsString()
  os: string;

  @IsString()
  processor: string;

  @IsInt()
  ramGb: number;

  @IsString()
  graphicsCard: string;

  @IsInt()
  storageGb: number;

  @IsOptional()
  @IsString()
  directxVersion?: string;

  @IsInt()
  gameId: number;
}
