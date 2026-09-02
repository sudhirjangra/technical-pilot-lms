import { Roles } from '@/common/decorators';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateQueryDto, ReplyQueryDto } from './dto';
import { StudentQueriesService } from './student-queries.service';

@ApiTags('Student Queries')
@Controller('student-queries')
export class StudentQueriesController {
  constructor(private readonly service: StudentQueriesService) {}

  // ── Student endpoints ──

  @Post()
  create(
    @Body() dto: CreateQueryDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.create(req.user.id, dto.subject, dto.body);
  }

  @Get('my')
  getMyQueries(@Req() req: { user: { id: string } }) {
    return this.service.getMyQueries(req.user.id);
  }

  // ── Admin endpoints ──

  @Get()
  @Roles('ADMIN', 'SUB_ADMIN')
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUB_ADMIN')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/reply')
  @Roles('ADMIN', 'SUB_ADMIN')
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyQueryDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.reply(id, dto.admin_reply, req.user.id);
  }
}
