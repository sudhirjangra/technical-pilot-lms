import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentQueriesController } from './student-queries.controller';
import { StudentQueriesService } from './student-queries.service';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [StudentQueriesController],
  providers: [StudentQueriesService],
})
export class StudentQueriesModule {}
