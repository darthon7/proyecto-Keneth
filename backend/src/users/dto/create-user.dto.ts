import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @Length(4, 50)
  @Matches(/^\S(?:.*\S)?$/, {
    message: 'La contraseña no puede iniciar ni terminar con espacios',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9._\-\s]{2,100}$/, {
    message: 'El nombre de usuario contiene caracteres no permitidos',
  })
  username: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'El código de país debe contener 2 letras ISO',
  })
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
