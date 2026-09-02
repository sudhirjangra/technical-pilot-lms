import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentQueriesController } from './student-queries.controller';
import { StudentQueriesService } from './student-queries.service';

@Module({
  imports: [NotificationsModule],
  controllers: [StudentQueriesController],
  providers: [StudentQueriesService],
})
export class StudentQueriesModule {}
