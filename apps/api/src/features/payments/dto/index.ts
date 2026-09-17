import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  course_id: string;

  @IsOptional()
  @IsString()
  coupon_code?: string;
}

export class VerifyPaymentDto {
  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_signature: string;
}

export class FailPaymentDto {
  @IsString()
  razorpay_order_id: string;

  @IsOptional()
  @IsString()
  razorpay_payment_id?: string;

  @IsOptional()
  @IsString()
  error_description?: string;

  @IsOptional()
  @IsString()
  error_code?: string;
}
