import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EditionFormat } from '../entities/game-edition.entity.js';

export class CreateGameEditionDto {
  @IsOptional()
  @IsString()
  editionName?: string;

  @IsEnum(EditionFormat)
  format: EditionFormat;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  isDlc?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockPhysical?: number;

  @IsInt()
  gameId: number;

  @IsInt()
  platformId: number;
}
