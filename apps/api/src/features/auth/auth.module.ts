import { MailModule } from '@/features/mail/mail.module';
import { ReferralsModule } from '@/features/referrals/referrals.module';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [MailModule, ReferralsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
