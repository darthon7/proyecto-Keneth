import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  userId: number;

  @IsInt()
  gameId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsInt()
  helpfulCount?: number;
}
