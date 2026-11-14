import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { KeyStatus } from '../entities/digital-key.entity.js';

export class CreateDigitalKeyDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  codeHash?: string;

  @IsOptional()
  @IsEnum(KeyStatus)
  status?: KeyStatus;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsInt()
  gameEditionId: number;
}

export class CreateBulkDigitalKeysDto {
  @IsInt()
  gameEditionId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codes?: string[];

  @IsOptional()
  @IsString()
  batchId?: string;
}
