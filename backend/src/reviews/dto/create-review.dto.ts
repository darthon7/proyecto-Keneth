import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsInt()
  @Min(1)
  gameId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,!?¡¿'"()&:-]{2,150}$/, {
    message: 'El título de la reseña contiene caracteres no válidos',
  })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(2000)
  @Matches(/^(?=.*\S)[\s\S]{3,2000}$/, {
    message: 'La reseña no puede estar vacía ni contener solo espacios',
  })
  body: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  helpfulCount?: number;
}
