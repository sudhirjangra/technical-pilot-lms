import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateQueryDto {
  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(5000)
  body: string;
}

export class ReplyQueryDto {
  @IsString()
  @MaxLength(5000)
  admin_reply: string;
}

export class QueryFilterDto {
  @IsOptional()
  @IsString()
  status?: 'open' | 'answered' | 'closed';
}

export class RequestExtraAttemptDto {
  @IsUUID()
  assignment_id: string;

  @IsOptional()
  @IsUUID()
  lesson_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class GrantExtraAttemptDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  extra_attempts?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  admin_reply?: string;
}
