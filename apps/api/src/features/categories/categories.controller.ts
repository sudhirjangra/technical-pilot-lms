import { Permissions, Public, Roles } from '@/common/decorators';
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
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, ReorderCategoriesDto, UpdateCategoryDto } from './dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(dto);
    return { message: 'Category created successfully', data };
  }

  @Public()
  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const data = await this.categoriesService.findAll(
      includeInactive === 'true',
    );
    return { message: 'Categories fetched successfully', data };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.categoriesService.findOne(id);
    return { message: 'Category fetched successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Patch('reorder')
  async reorder(@Body() dto: ReorderCategoriesDto) {
    await this.categoriesService.reorder(dto.categories);
    return { message: 'Categories reordered successfully' };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(id, dto);
    return { message: 'Category updated successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.remove(id);
    return { message: 'Category deleted successfully' };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('courses:write')
  @Post(':id/thumbnail')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  async uploadThumbnail(@Param('id', ParseUUIDPipe) id: string, @Req() request: FastifyRequest) {
    const data = await this.categoriesService.uploadThumbnail(id, request);
    return { message: 'Thumbnail uploaded successfully', data };
  }
}
