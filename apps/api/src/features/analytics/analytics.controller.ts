import { Roles } from '@/common/decorators';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@Roles('ADMIN', 'SUB_ADMIN')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** Dashboard overview with high-level stats */
  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  /** Analytics for a specific course */
  @Get('courses/:courseId')
  getCourseAnalytics(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.analyticsService.getCourseAnalytics(courseId);
  }

  /** Enrolled students for a specific course with progress */
  @Get('courses/:courseId/students')
  getCourseStudents(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.analyticsService.getCourseStudents(courseId);
  }

  /** Chapter-level analytics within a course */
  @Get('courses/:courseId/chapters/:chapterId')
  getChapterAnalytics(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
  ) {
    return this.analyticsService.getChapterAnalytics(courseId, chapterId);
  }

  /** Comprehensive detail for a student */
  @Get('students/:studentId')
  getStudentDetail(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.analyticsService.getStudentDetail(studentId);
  }

  /** All test and assignment attempts for a student */
  @Get('students/:studentId/attempts')
  getStudentAttempts(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.analyticsService.getStudentAttempts(studentId);
  }

  /** Detailed progress for a student in a specific course */
  @Get('students/:studentId/courses/:courseId')
  getStudentCourseDetail(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.analyticsService.getStudentCourseDetail(studentId, courseId);
  }
}
