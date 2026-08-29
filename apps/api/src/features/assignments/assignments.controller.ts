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
  CreateAssignmentDto,
  CreateAssignmentQuestionDto,
  ReorderAssignmentQuestionsDto,
  UpdateAssignmentDto,
  UpdateAssignmentQuestionDto,
} from './dto';
import { AssignmentsService } from './assignments.service';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateAssignmentDto) {
    const data = await this.assignmentsService.create(dto);
    return { message: 'Assignment created', data };
  }

  @Roles('ADMIN')
  @Get('lesson/:lessonId')
  async findByLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    const data = await this.assignmentsService.findByLesson(lessonId);
    return { message: 'Assignment fetched', data };
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    const data = await this.assignmentsService.update(id, dto);
    return { message: 'Assignment updated', data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.assignmentsService.remove(id);
    return { message: 'Assignment deleted' };
  }

  @Roles('ADMIN')
  @Post(':id/questions')
  async createQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAssignmentQuestionDto,
  ) {
    const data = await this.assignmentsService.createQuestion(id, dto);
    return { message: 'Question created', data };
  }

  @Roles('ADMIN')
  @Patch('questions/:questionId')
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateAssignmentQuestionDto,
  ) {
    const data = await this.assignmentsService.updateQuestion(questionId, dto);
    return { message: 'Question updated', data };
  }

  @Roles('ADMIN')
  @Delete('questions/:questionId')
  async removeQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    await this.assignmentsService.removeQuestion(questionId);
    return { message: 'Question deleted' };
  }

  @Roles('ADMIN')
  @Patch(':id/questions/reorder')
  async reorderQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderAssignmentQuestionsDto,
  ) {
    await this.assignmentsService.reorderQuestions(id, dto.questions);
    return { message: 'Questions reordered' };
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
