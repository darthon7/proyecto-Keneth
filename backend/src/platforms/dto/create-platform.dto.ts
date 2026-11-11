import { IsOptional, IsString } from 'class-validator';

export class CreatePlatformDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;
}
