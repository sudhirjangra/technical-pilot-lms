import { Roles } from '@/common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DoubtSessionsService } from './doubt-sessions.service';
import {
  BookSlotDto,
  CreateSlotDto,
  UpdateBookingDto,
  UpdateSlotDto,
} from './dto';

@ApiTags('Doubt Sessions')
@Controller('doubt-sessions')
export class DoubtSessionsController {
  constructor(private readonly service: DoubtSessionsService) {}

  // ── Admin endpoints ──

  @Post('slots')
  @Roles('ADMIN')
  createSlot(@Body() dto: CreateSlotDto, @Req() req: { user: { id: string } }) {
    return this.service.createSlot(dto, req.user.id);
  }

  @Get('slots')
  @Roles('ADMIN')
  getSlots(@Query('date') date?: string, @Query('status') status?: string) {
    return this.service.getSlots({ date, status });
  }

  @Patch('slots/:id')
  @Roles('ADMIN')
  updateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlotDto,
  ) {
    return this.service.updateSlot(id, dto);
  }

  @Delete('slots/:id')
  @Roles('ADMIN')
  deleteSlot(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteSlot(id);
  }

  @Get('slots/:id/bookings')
  @Roles('ADMIN')
  getSlotBookings(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSlotBookings(id);
  }

  @Patch('bookings/:id')
  @Roles('ADMIN')
  updateBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.service.updateBooking(id, dto);
  }

  // ── Student endpoints ──

  @Get('upcoming')
  getUpcomingSlots() {
    return this.service.getUpcomingSlots();
  }

  @Post('book')
  bookSlot(@Body() dto: BookSlotDto, @Req() req: { user: { id: string } }) {
    return this.service.bookSlot(dto, req.user.id);
  }

  @Post('bookings/:id/cancel')
  cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.cancelBooking(id, req.user.id);
  }

  @Get('my-bookings')
  getMyBookings(@Req() req: { user: { id: string } }) {
    return this.service.getMyBookings(req.user.id);
  }
}
