import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateWishlistDto {
  @IsInt()
  userId: number;

  @IsInt()
  gameId: number;

  @IsOptional()
  @IsBoolean()
  notifyOnSale?: boolean;
}
