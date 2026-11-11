import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateUserLibraryDto {
  @IsInt()
  userId: number;

  @IsInt()
  gameEditionId: number;

  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsOptional()
  @IsBoolean()
  isRevoked?: boolean;
}
