import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class ApplyDiscountCampaignDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  gameIds: number[];

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

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(95)
  discountPercentage: number;

  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;
}
