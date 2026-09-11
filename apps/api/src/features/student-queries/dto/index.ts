import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateContactQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;
}

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
  @IsIn(['assignment', 'test'])
  assessment_type: 'assignment' | 'test';

  @IsUUID()
  assessment_id: string;

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
