import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGameDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  @IsString()
  esrbRating?: string;

  @IsDateString()
  releaseDate: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  discountCampaignName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(95)
  discountPercentage?: number;

  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @IsInt()
  publisherId: number;

  @IsInt()
  developerId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  genreIds?: number[];
}
