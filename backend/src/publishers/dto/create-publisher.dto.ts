import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreatePublisherDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}
