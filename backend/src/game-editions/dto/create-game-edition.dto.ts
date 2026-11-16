import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { EditionFormat } from '../entities/game-edition.entity.js';

export class CreateGameEditionDto {
  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(100)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{2,100}$/, {
    message: 'El nombre de la edición contiene caracteres no válidos',
  })
  editionName?: string;

  @IsOptional()
  @IsEnum(EditionFormat)
  format?: EditionFormat;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999.99)
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  isDlc?: boolean;

  @IsInt()
  @Min(1)
  gameId: number;

  @IsInt()
  @Min(1)
  platformId: number;
}
