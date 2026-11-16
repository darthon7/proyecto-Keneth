import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateGenreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{2,50}$/, {
    message: 'El nombre del género contiene caracteres no válidos',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo permite minúsculas, números y guiones',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
