import { Roles } from '@/common/decorators';
import {
  Audit,
  AuditLogInterceptor,
} from '@/common/interceptors/audit-log.interceptor';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('Enrollments')
@Controller('enrollments')
@UseInterceptors(AuditLogInterceptor)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /** Admin: manually enroll a student */
  @Post()
  @Roles('ADMIN')
  @Audit('enrollment.create')
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(dto);
  }

  /** Student: get their own enrollments */
  @Get('my')
  getMyEnrollments(@Req() req: { user: { id: string } }) {
    return this.enrollmentsService.findByStudent(req.user.id);
  }

  /** Admin: get enrollments for a course */
  @Get('course/:courseId')
  @Roles('ADMIN')
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    const data = await this.enrollmentsService.findByCourse(courseId);
    return { data };
  }

  /** Admin: get specific enrollment */
  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentsService.findOne(id);
  }

  /** Admin: update enrollment status */
  @Patch(':id')
  @Roles('ADMIN')
  @Audit('enrollment.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentsService.update(id, dto);
  }

  /** Check enrollment status for a course (student self-check) */
  @Get('check/:courseId')
  async checkEnrollment(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req: { user: { id: string } },
  ) {
    const enrolled = await this.enrollmentsService.verifyEnrollment(
      req.user.id,
      courseId,
    );
    return { enrolled };
  }

  /** Student: enroll in a free (price=0) course without payment */
  @Post('free/:courseId')
  @Audit('enrollment.free')
  async enrollFree(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.enrollmentsService.enrollFree(
      req.user.id,
      courseId,
    );
    return { message: 'Enrolled successfully', data };
  }
}
