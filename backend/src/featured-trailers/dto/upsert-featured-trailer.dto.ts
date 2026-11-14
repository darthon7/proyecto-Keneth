import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertFeaturedTrailerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  imageUrl: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  youtubeUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;
}
