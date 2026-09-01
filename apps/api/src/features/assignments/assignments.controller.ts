import { Permissions, Roles } from '@/common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateAssignmentDto,
  CreateAssignmentQuestionDto,
  GradeAttemptDto,
  ReorderAssignmentQuestionsDto,
  SaveAssignmentAnswerDto,
  SubmitAssignmentAttemptDto,
  UpdateAssignmentDto,
  UpdateAssignmentQuestionDto,
} from './dto';
import { AssignmentsService } from './assignments.service';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Roles('ADMIN', 'SUB_ADMIN')
  @Post()
  async create(@Body() dto: CreateAssignmentDto) {
    const data = await this.assignmentsService.create(dto);
    return { message: 'Assignment created', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Get('lesson/:lessonId')
  async findByLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    const data = await this.assignmentsService.findByLesson(lessonId);
    return { message: 'Assignment fetched', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    const data = await this.assignmentsService.update(id, dto);
    return { message: 'Assignment updated', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.assignmentsService.remove(id);
    return { message: 'Assignment deleted' };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Post(':id/questions')
  async createQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAssignmentQuestionDto,
  ) {
    const data = await this.assignmentsService.createQuestion(id, dto);
    return { message: 'Question created', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Patch('questions/:questionId')
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateAssignmentQuestionDto,
  ) {
    const data = await this.assignmentsService.updateQuestion(questionId, dto);
    return { message: 'Question updated', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Delete('questions/:questionId')
  async removeQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    await this.assignmentsService.removeQuestion(questionId);
    return { message: 'Question deleted' };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Patch(':id/questions/reorder')
  async reorderQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderAssignmentQuestionsDto,
  ) {
    await this.assignmentsService.reorderQuestions(id, dto.questions);
    return { message: 'Questions reordered' };
  }

  // ── Student routes ────────────────────────────────────────────────────────

  @Get('student/lesson/:lessonId')
  async getAssignmentForStudentLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.assignmentsService.getAssignmentForStudentLesson(lessonId, req.user.id);
    return { message: 'Assignment fetched', data };
  }

  @Get('student/my-attempts')
  async getMyAttempts(@Req() req: { user: { id: string } }) {
    const data = await this.assignmentsService.getMyAttempts(req.user.id);
    return { message: 'Attempts fetched', data };
  }

  @Post('student/:assignmentId/attempts')
  async startAttempt(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.assignmentsService.startAttempt(assignmentId, req.user.id);
    return { message: 'Attempt started', data };
  }

  @Post('student/attempts/:attemptId/submit')
  async submitAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitAssignmentAttemptDto,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.assignmentsService.submitAttempt(attemptId, req.user.id, dto);
    return { message: 'Attempt submitted', data };
  }

  @Patch('student/attempts/:attemptId/answers/:questionId')
  async saveAnswer(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: SaveAssignmentAnswerDto,
    @Req() req: { user: { id: string } },
  ) {
    await this.assignmentsService.saveAnswer(attemptId, questionId, req.user.id, dto);
    return { message: 'Answer saved' };
  }

  // ── End student routes ────────────────────────────────────────────────────

  // ── Admin analytics routes ────────────────────────────────────────────────

  @Roles('ADMIN', 'SUB_ADMIN')
  @Get(':id/attempts')
  async getAssignmentAttempts(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.assignmentsService.getAssignmentAttempts(id);
    return { message: 'Attempts fetched', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Get('attempts/:attemptId')
  async getAssignmentAttemptDetail(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    const data = await this.assignmentsService.getAssignmentAttemptDetail(attemptId);
    return { message: 'Attempt detail fetched', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('assignments:grade')
  @Patch('attempts/:attemptId/grade')
  async gradeAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: GradeAttemptDto,
  ) {
    const data = await this.assignmentsService.gradeAttemptAnswers(attemptId, dto.grades);
    return { message: 'Grades applied', data };
  }

  // ── End admin analytics routes ────────────────────────────────────────────

  @Get('student/attempts/:attemptId')
  async getStudentAttemptDetail(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    const data = await this.assignmentsService.findAttemptForStudent(attemptId, req.user.id, req.user.role);
    return { message: 'Attempt detail fetched', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Post(':id/import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Import assignment questions',
    description:
      'Uploads a CSV, JSON, or XLSX question bank and replaces all existing questions for this assignment.',
  })
  async importQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.assignmentsService.importQuestions(id, request);
    return { message: `Imported ${data.count} questions`, data };
  }
}
