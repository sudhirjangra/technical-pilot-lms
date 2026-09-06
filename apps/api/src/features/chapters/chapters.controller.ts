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
import { ChaptersService } from './chapters.service';
import { CreateChapterDto, ReorderChaptersDto, UpdateChapterDto } from './dto';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post()
  async create(@Body() dto: CreateChapterDto) {
    const data = await this.chaptersService.create(dto);
    return { message: 'Chapter created successfully', data };
  }

  @Get('course/:courseId')
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    const data = await this.chaptersService.findByCourse(courseId);
    return { message: 'Chapters fetched successfully', data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.chaptersService.findOne(id);
    return { message: 'Chapter fetched successfully', data };
  }

  /** Student: mark a chapter as started (anchors assignment due dates) */
  @Post(':id/start')
  async startChapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: Record<string, never> = {},
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.chaptersService.startChapter(id, req.user.id);
    return { message: 'Chapter started', data };
  }

  /** Student: get their chapter start record (null when not started) */
  @Get(':id/start')
  async getChapterStart(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.chaptersService.getChapterStart(id, req.user.id);
    return { message: 'Chapter start fetched successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Patch('reorder')
  async reorder(@Body() dto: ReorderChaptersDto) {
    await this.chaptersService.reorder(dto.chapters);
    return { message: 'Chapters reordered successfully' };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChapterDto,
  ) {
    const data = await this.chaptersService.update(id, dto);
    return { message: 'Chapter updated successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.chaptersService.remove(id);
    return { message: 'Chapter deleted successfully' };
  }
}
