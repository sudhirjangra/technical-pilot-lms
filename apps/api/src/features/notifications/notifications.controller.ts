import { Roles } from '@/common/decorators';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BroadcastNotificationDto, SendNotificationDto } from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // ── Student endpoints ──

  @Get('my')
  getMyNotifications(@Req() req: { user: { id: string } }) {
    return this.service.getMyNotifications(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: { user: { id: string } }) {
    return this.service.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.markRead(id, req.user.id);
  }

  @Post('mark-all-read')
  markAllRead(@Req() req: { user: { id: string } }) {
    return this.service.markAllRead(req.user.id);
  }

  // ── Admin endpoints ──

  @Post('broadcast')
  @Roles('ADMIN', 'SUB_ADMIN')
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.service.broadcast(dto.title, dto.body, dto.type, dto.course_id);
  }

  @Post('send')
  @Roles('ADMIN', 'SUB_ADMIN')
  send(@Body() dto: SendNotificationDto) {
    return this.service.send(
      dto.recipient_id,
      dto.title,
      dto.body,
      dto.type,
      dto.metadata,
    );
  }
}
