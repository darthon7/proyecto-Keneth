import { Type } from 'class-transformer';
import {
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { PaymentStatus } from '../entities/order.entity.js';

export class OrderItemDto {
  @IsInt()
  @Min(1)
  gameEditionId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;
}

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsOptional()
  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]{2,50}$/, {
    message: 'El código de cupón tiene un formato inválido',
  })
  couponCode?: string;

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

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
