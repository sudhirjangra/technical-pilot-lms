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
  Req,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateTestDto,
  CreateTestQuestionDto,
  GradeAttemptDto,
  ReorderTestQuestionsDto,
  SaveAnswerDto,
  SubmitTestAttemptDto,
  UpdateTestDto,
  UpdateTestQuestionDto,
} from './dto';
import { TestsService } from './tests.service';

@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateTestDto) {
    const data = await this.testsService.create(dto);
    return { message: 'Test created', data };
  }

  @Roles('ADMIN')
  @Get('lesson/:lessonId')
  async findByLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    const data = await this.testsService.findByLesson(lessonId);
    return { message: 'Test fetched', data };
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestDto,
  ) {
    const data = await this.testsService.update(id, dto);
    return { message: 'Test updated', data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.testsService.remove(id);
    return { message: 'Test deleted' };
  }

  @Roles('ADMIN')
  @Post(':id/questions')
  async createQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTestQuestionDto,
  ) {
    const data = await this.testsService.createQuestion(id, dto);
    return { message: 'Question created', data };
  }

  @Roles('ADMIN')
  @Patch('questions/:questionId')
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateTestQuestionDto,
  ) {
    const data = await this.testsService.updateQuestion(questionId, dto);
    return { message: 'Question updated', data };
  }

  @Roles('ADMIN')
  @Delete('questions/:questionId')
  async removeQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    await this.testsService.removeQuestion(questionId);
    return { message: 'Question deleted' };
  }

  @Roles('ADMIN')
  @Patch(':id/questions/reorder')
  async reorderQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderTestQuestionsDto,
  ) {
    await this.testsService.reorderQuestions(id, dto.questions);
    return { message: 'Questions reordered' };
  }

  // ── Student routes ───────────────────────────────────────────────────────

  @Get('student/lesson/:lessonId')
  async getTestForStudentLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.testsService.getTestForStudentLesson(
      lessonId,
      req.user.id,
    );
    return { message: 'Test fetched', data };
  }

  @Post('student/:testId/attempts')
  async startAttempt(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.testsService.startAttempt(testId, req.user.id);
    return { message: 'Attempt started', data };
  }

  @Post('student/attempts/:attemptId/submit')
  async submitAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitTestAttemptDto,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.testsService.submitAttempt(
      attemptId,
      req.user.id,
      dto,
    );
    return { message: 'Attempt submitted', data };
  }

  @Patch('student/attempts/:attemptId/answers/:questionId')
  async saveAnswer(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: SaveAnswerDto,
    @Req() req: { user: { id: string } },
  ) {
    await this.testsService.saveAnswer(
      attemptId,
      questionId,
      req.user.id,
      dto,
    );
    return { message: 'Answer saved' };
  }

  // ── End student routes ────────────────────────────────────────────────────

  // ── Admin analytics routes ────────────────────────────────────────────────

  @Roles('ADMIN')
  @Get(':id/attempts')
  async getTestAttempts(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.testsService.getTestAttempts(id);
    return { message: 'Attempts fetched', data };
  }

  @Roles('ADMIN')
  @Get('attempts/:attemptId')
  async getAttemptDetail(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    const data = await this.testsService.getAttemptDetail(attemptId);
    return { message: 'Attempt detail fetched', data };
  }

  @Roles('ADMIN')
  @Patch('attempts/:attemptId/grade')
  async gradeAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: GradeAttemptDto,
  ) {
    const data = await this.testsService.gradeAttemptAnswers(attemptId, dto.grades);
    return { message: 'Grades applied', data };
  }

  // ── End admin analytics routes ────────────────────────────────────────────

  @Get('student/attempts/:attemptId')
  async getStudentAttemptDetail(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    const data = await this.testsService.findAttemptForStudent(attemptId, req.user.id, req.user.role);
    return { message: 'Attempt detail fetched', data };
  }

  @Roles('ADMIN')
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
    summary: 'Import test questions',
    description:
      'Uploads a CSV, JSON, or XLSX question bank and replaces all existing questions for this test.',
  })
  async importQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.testsService.importQuestions(id, request);
    return { message: `Imported ${data.count} questions`, data };
  }
}
