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

export class TestQuestionOptionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  option_text: string;

  @ApiProperty()
  @IsBoolean()
  is_correct: boolean;
}

export class CreateTestDto {
  @ApiProperty()
  @IsUUID()
  lesson_id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

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

export class UpdateTestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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

export class CreateTestQuestionDto {
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

  @ApiPropertyOptional({ description: 'Question number shown to the student' })
  @IsOptional()
  @IsInt()
  @Min(1)
  question_number?: number;

  @ApiPropertyOptional({
    description: 'Expected answer for question_type = text',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  correct_text_answer?: string;

  @ApiPropertyOptional({ description: 'Topic or subject for analytics grouping' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @ApiPropertyOptional({ type: [TestQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestQuestionOptionDto)
  options?: TestQuestionOptionDto[];
}

export class UpdateTestQuestionDto {
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

  @ApiPropertyOptional({ description: 'Question number shown to the student' })
  @IsOptional()
  @IsInt()
  @Min(1)
  question_number?: number;

  @ApiPropertyOptional({
    description: 'Expected answer for question_type = text',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  correct_text_answer?: string;

  @ApiPropertyOptional({ description: 'Topic or subject for analytics grouping' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @ApiPropertyOptional({ type: [TestQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestQuestionOptionDto)
  options?: TestQuestionOptionDto[];
}

export class ReorderTestQuestionItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sort_order: number;
}

export class ReorderTestQuestionsDto {
  @ApiProperty({ type: [ReorderTestQuestionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTestQuestionItemDto)
  questions: ReorderTestQuestionItemDto[];
}

// --- Student DTOs ---

export class SubmitAnswerDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedOptionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  textAnswer?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  timeSpentSeconds: number;
}

export class SubmitTestAttemptDto {
  @ApiProperty({ type: [SubmitAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}

export class SaveAnswerDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedOptionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  textAnswer?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  timeSpentSeconds: number;
}

export class GradeItemDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect: boolean;
}

export class GradeAttemptDto {
  @ApiProperty({ type: [GradeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeItemDto)
  grades: GradeItemDto[];
}
