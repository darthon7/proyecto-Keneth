import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ApplyDiscountCampaignDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  gameIds: number[];

  @IsOptional()
  @IsString()
  discountCampaignName?: string;

  @IsNumber()
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
