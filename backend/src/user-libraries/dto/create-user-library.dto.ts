import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateUserLibraryDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsInt()
  @Min(1)
  gameEditionId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  orderId?: number;

  @IsOptional()
  @IsBoolean()
  isRevoked?: boolean;
}
