import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateDeveloperDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  foundedYear?: number;
}
