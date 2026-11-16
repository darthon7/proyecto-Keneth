import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateWishlistDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsInt()
  @Min(1)
  gameId: number;

  @IsOptional()
  @IsBoolean()
  notifyOnSale?: boolean;
}
