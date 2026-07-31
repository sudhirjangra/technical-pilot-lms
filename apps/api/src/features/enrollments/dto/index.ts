import { IsEnum, IsOptional, IsUUID } from 'class-validator';

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
