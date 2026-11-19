import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateDeveloperDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{2,150}$/, {
    message: 'El nombre de la desarrolladora contiene caracteres no válidos',
  })
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'El país debe ser un código ISO-2 de 2 letras',
  })
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  foundedYear?: number;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/[^\s]*|https?:\/\/[^\s/$.?#].[^\s]*)$/i, {
    message:
      'La URL de la imagen de portada debe ser http(s):// válida o ruta /...',
  })
  coverImagenUrl?: string;
}
