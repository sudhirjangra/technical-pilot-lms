import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AssignmentQuestionOptionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  option_text: string;

  @ApiProperty()
  @IsBoolean()
  is_correct: boolean;
}

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  lesson_id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  due_days_after_enrollment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  time_limit_seconds?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passing_score_percent?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_attempts?: number;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  max_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  due_days_after_enrollment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  time_limit_seconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passing_score_percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  max_attempts?: number;
}

export class CreateAssignmentQuestionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  question_text: string;

  @ApiProperty({ enum: ['mcq', 'msq', 'text'] })
  @IsEnum(['mcq', 'msq', 'text'])
  question_type: 'mcq' | 'msq' | 'text';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ type: [AssignmentQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentQuestionOptionDto)
  options?: AssignmentQuestionOptionDto[];
}

export class UpdateAssignmentQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question_text?: string;

  @ApiPropertyOptional({ enum: ['mcq', 'msq', 'text'] })
  @IsOptional()
  @IsEnum(['mcq', 'msq', 'text'])
  question_type?: 'mcq' | 'msq' | 'text';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ type: [AssignmentQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentQuestionOptionDto)
  options?: AssignmentQuestionOptionDto[];
}

export class ReorderAssignmentQuestionsDto {
  @ApiProperty({ type: [Object] })
  questions: { id: string; sort_order: number }[];
}
