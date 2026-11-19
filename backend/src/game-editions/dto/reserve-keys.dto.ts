import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class ReserveKeysDto {
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima a reservar es 1' })
  @Max(20, { message: 'No puedes reservar más de 20 claves a la vez' })
  quantity: number;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ReleaseKeysDto {
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima a liberar es 1' })
  quantity: number;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
