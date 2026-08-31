import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  student_id: string;

  @IsUUID()
  course_id: string;
}

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsEnum(['active', 'completed', 'expired'])
  status?: 'active' | 'completed' | 'expired';
}

export class ListEnrollmentsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by student id' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by course id' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ enum: ['active', 'completed', 'expired'] })
  @IsOptional()
  @IsEnum(['active', 'completed', 'expired'])
  status?: 'active' | 'completed' | 'expired';

  @ApiPropertyOptional({ description: 'Matches student full_name or email' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
