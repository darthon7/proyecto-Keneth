import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
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

  @IsInt()
  publisherId: number;

  @IsInt()
  developerId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  genreIds?: number[];
}
