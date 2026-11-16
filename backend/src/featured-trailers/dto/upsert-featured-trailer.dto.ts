import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertFeaturedTrailerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{1,180}$/, {
    message: 'El título del tráiler contiene caracteres no válidos',
  })
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^(\/[^\s]*|https?:\/\/[^\s/$.?#].[^\s]*)$/i, {
    message: 'La URL de la imagen debe ser http(s):// válida o ruta /...',
  })
  imageUrl: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  @Matches(
    /^(?:[a-zA-Z0-9_-]{11}|https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:[?&][^\s]*)?)$/i,
    {
      message: 'Ingresa una URL o ID de YouTube válido',
    },
  )
  youtubeUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;
}
