import { IsOptional, IsString } from 'class-validator';

export class CreateGenreDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;
}
