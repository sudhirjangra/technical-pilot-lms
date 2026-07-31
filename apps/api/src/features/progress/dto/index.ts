import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsOptional()
  @IsEnum(['not_started', 'in_progress', 'completed'])
  status?: 'not_started' | 'in_progress' | 'completed';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress_percent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  last_position_seconds?: number;
}

export class CreateProgressDto {
  @IsUUID()
  lesson_id: string;
}
