import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreatePublisherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,&'()/:|+!?¡¿-]{2,150}$/, {
    message: 'El nombre del publisher contiene caracteres no válidos',
  })
  name: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @MaxLength(255)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  websiteUrl?: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsEmail()
  @MaxLength(100)
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'El país debe ser un código ISO-2 de 2 letras',
  })
  country?: string;
}
