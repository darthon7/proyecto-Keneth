import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { KeyStatus } from '../entities/digital-key.entity.js';

export class CreateDigitalKeyDto {
  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(255)
  @Matches(/^[A-Za-z0-9]{2,10}(?:-[A-Za-z0-9]{2,10}){1,7}$/, {
    message: 'Formato de clave digital inválido (ej. XXXX-XXXX-XXXX-XXXX)',
  })
  code?: string;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'El hash SHA-256 debe tener exactamente 64 caracteres hexadecimales',
  })
  codeHash?: string;

  @IsOptional()
  @IsEnum(KeyStatus)
  status?: KeyStatus;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]{2,50}$/, {
    message: 'El lote solo permite letras, números, guiones y guion bajo',
  })
  batchId?: string;

  @IsInt()
  @Min(1)
  gameEditionId: number;
}

export class CreateBulkDigitalKeysDto {
  @IsInt()
  @Min(1)
  gameEditionId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[A-Za-z0-9]{2,10}(?:-[A-Za-z0-9]{2,10}){1,7}$/, {
    each: true,
    message: 'Cada clave debe tener formato alfanumérico separado por guiones',
  })
  codes?: string[];

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]{2,50}$/, {
    message: 'El lote solo permite letras, números, guiones y guion bajo',
  })
  batchId?: string;
}
