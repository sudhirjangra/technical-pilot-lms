import { IsString, IsUUID } from 'class-validator';

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
