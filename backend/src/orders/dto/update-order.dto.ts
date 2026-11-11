import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '../entities/order.entity.js';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  paymentGatewayRef?: string;
}
