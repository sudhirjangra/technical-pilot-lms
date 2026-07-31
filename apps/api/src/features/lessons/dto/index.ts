import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty()
  @IsUUID()
  chapter_id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty()
  @IsEnum(['video', 'pdf', 'assignment', 'test'])
  lesson_type: 'video' | 'pdf' | 'assignment' | 'test';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_seconds?: number;
}

export class UpdateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['video', 'pdf', 'assignment', 'test'])
  lesson_type?: 'video' | 'pdf' | 'assignment' | 'test';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_seconds?: number;
}

export class ReorderLessonsDto {
  @ApiProperty({ type: [Object] })
  lessons: { id: string; sort_order: number }[];
}
