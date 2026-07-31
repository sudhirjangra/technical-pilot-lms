import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  course_id: string;
}

export class VerifyPaymentDto {
  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_signature: string;
}

export class RefundPaymentDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
