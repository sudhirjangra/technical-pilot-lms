import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const NOTIFICATION_TYPES = [
  'course_added',
  'offer',
  'congratulation',
  'announcement',
  'assignment_due',
  'query_reply',
] as const;

export class BroadcastNotificationDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsEnum(NOTIFICATION_TYPES)
  type: string;

  @IsOptional()
  @IsUUID()
  course_id?: string;
}

export class SendNotificationDto {
  @IsUUID()
  recipient_id: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsEnum(NOTIFICATION_TYPES)
  type: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
