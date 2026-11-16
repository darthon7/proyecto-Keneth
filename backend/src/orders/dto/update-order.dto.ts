import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaymentStatus } from '../entities/order.entity.js';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._:-]{2,100}$/, {
    message: 'La referencia de pasarela tiene un formato inválido',
  })
  paymentGatewayRef?: string;
}
