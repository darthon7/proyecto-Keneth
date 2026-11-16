import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreatePlatformDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{2,50}$/, {
    message: 'El nombre de la plataforma contiene caracteres no válidos',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9_-]{2,20}$/, {
    message: 'El código solo permite letras, números, guiones y guion bajo',
  })
  code: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(255)
  @Matches(/^(\/[^\s]*|https?:\/\/[^\s/$.?#].[^\s]*)$/i, {
    message: 'La URL del icono debe ser http(s):// válida o ruta /...',
  })
  iconUrl?: string;
}
