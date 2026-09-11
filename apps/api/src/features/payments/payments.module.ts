import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [MailModule, ReferralsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
