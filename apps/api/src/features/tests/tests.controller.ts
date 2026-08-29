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
  ReorderTestQuestionsDto,
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
