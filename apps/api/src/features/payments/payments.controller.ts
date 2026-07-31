import { Public, Roles } from '@/common/decorators';
import { AuditLogInterceptor, Audit } from '@/common/interceptors/audit-log.interceptor';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateOrderDto, RefundPaymentDto, VerifyPaymentDto } from './dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
@UseInterceptors(AuditLogInterceptor)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Student: create payment order for a course */
  @Post('order')
  @Audit('payment.order_created')
  createOrder(@Body() dto: CreateOrderDto, @Req() req: { user: { id: string } }) {
    return this.paymentsService.createOrder(dto, req.user.id);
  }

  /** Student: verify payment after Razorpay checkout */
  @Post('verify')
  @Audit('payment.verified')
  verifyPayment(@Body() dto: VerifyPaymentDto, @Req() req: { user: { id: string } }) {
    return this.paymentsService.verifyPayment(dto, req.user.id);
  }

  /** Razorpay webhook — no auth required, signature verified internally */
  @Post('webhook')
  @Public()
  handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }

  /** Student: get own payment history */
  @Get('my')
  getMyPayments(@Req() req: { user: { id: string } }) {
    return this.paymentsService.findByStudent(req.user.id);
  }

  /** Admin: list all payments */
  @Get()
  @Roles('ADMIN')
  findAll(
    @Query('status') status?: string,
    @Query('course_id') course_id?: string,
    @Query('student_id') student_id?: string,
  ) {
    return this.paymentsService.findAll({ status, course_id, student_id });
  }

  /** Admin: refund a payment */
  @Post(':id/refund')
  @Roles('ADMIN')
  @Audit('payment.refunded')
  refund(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RefundPaymentDto) {
    return this.paymentsService.refund(id, dto);
  }
}
