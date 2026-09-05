import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DoubtSessionsController } from './doubt-sessions.controller';
import { DoubtSessionsService } from './doubt-sessions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DoubtSessionsController],
  providers: [DoubtSessionsService],
})
export class DoubtSessionsModule {}
