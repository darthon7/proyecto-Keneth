import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,%&'()/:|+!?¡¿-]{2,150}$/, {
    message: 'El nombre de la promoción contiene caracteres no válidos',
  })
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  discountPercentage: number;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]{2,50}$/, {
    message: 'El cupón solo permite letras, números, guiones y guion bajo',
  })
  couponCode: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
