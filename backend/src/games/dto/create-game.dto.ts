import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{1,200}$/, {
    message: 'El título del videojuego contiene caracteres no válidos',
  })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo permite minúsculas, números y guiones',
  })
  slug: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(10)
  @Matches(/^(EC|E|E10\+|T|M|AO|RP)$/i, {
    message: 'Clasificación ESRB inválida (usa EC, E, E10+, T, M, AO o RP)',
  })
  esrbRating?: string;

  @IsDateString()
  releaseDate: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(255)
  @Matches(/^(\/[^\s]*|https?:\/\/[^\s/$.?#].[^\s]*)$/i, {
    message: 'La URL de portada debe ser http(s):// válida o ruta /...',
  })
  coverImageUrl?: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(120)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,%&'()/:|+!?¡¿-]{2,120}$/, {
    message: 'El nombre de la campaña contiene caracteres no válidos',
  })
  discountCampaignName?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(95)
  discountPercentage?: number;

  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @IsInt()
  @Min(1)
  publisherId: number;

  @IsInt()
  @Min(1)
  developerId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  genreIds?: number[];
}
