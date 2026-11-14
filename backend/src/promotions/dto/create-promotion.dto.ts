import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @IsString()
  @MinLength(2)
  couponCode: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
