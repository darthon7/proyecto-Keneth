import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { KeyStatus } from '../entities/digital-key.entity.js';

export class CreateDigitalKeyDto {
  @IsString()
  code: string;

  @IsString()
  codeHash: string;

  @IsOptional()
  @IsEnum(KeyStatus)
  status?: KeyStatus;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsInt()
  gameEditionId: number;
}
