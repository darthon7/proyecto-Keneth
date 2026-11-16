import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { RequirementTier } from '../entities/system-requirement.entity.js';

export class CreateSystemRequirementDto {
  @IsEnum(RequirementTier)
  tier: RequirementTier;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,/()+_™®-]{2,100}$/, {
    message: 'El sistema operativo contiene caracteres no válidos',
  })
  os: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,/()+_™®-]{2,150}$/, {
    message: 'El procesador contiene caracteres no válidos',
  })
  processor: string;

  @IsInt()
  @Min(1)
  @Max(512)
  ramGb: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(/^(?=.*\S)[a-zA-ZÀ-ÿ0-9\s.,/()+_™®-]{2,150}$/, {
    message: 'La tarjeta de video contiene caracteres no válidos',
  })
  graphicsCard: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  storageGb: number;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(50)
  @Matches(/^(?=.*\S)[a-zA-Z0-9.\s_+-]{2,50}$/, {
    message: 'La versión de DirectX contiene caracteres no válidos',
  })
  directxVersion?: string;

  @IsInt()
  @Min(1)
  gameId: number;
}
