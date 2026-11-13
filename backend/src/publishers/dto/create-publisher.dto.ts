import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreatePublisherDto {
  @IsString()
  name: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  websiteUrl?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}
