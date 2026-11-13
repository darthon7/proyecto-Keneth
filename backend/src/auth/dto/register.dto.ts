import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(4, 50)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  username: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;
}

