import { Public, Roles } from '@/common/decorators';
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
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles('ADMIN')
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

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(id, dto);
    return { message: 'Category updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.remove(id);
    return { message: 'Category deleted successfully' };
  }
}
