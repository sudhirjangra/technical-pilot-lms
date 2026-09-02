import { IsOptional, IsString, MaxLength } from 'class-validator';

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
