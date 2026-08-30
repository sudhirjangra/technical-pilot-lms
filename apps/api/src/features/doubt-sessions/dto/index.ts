import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSlotDto {
  @IsDateString()
  date: string;

  @IsString()
  start_time: string;

  @IsString()
  end_time: string;

  @IsInt()
  @Min(5)
  @Max(180)
  duration_minutes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  max_bookings?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  meeting_link?: string;
}

export class UpdateSlotDto {
  @IsOptional()
  @IsEnum(['available', 'full', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  meeting_link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class BookSlotDto {
  @IsUUID()
  slot_id: string;
}

export class UpdateBookingDto {
  @IsEnum(['confirmed', 'cancelled', 'completed', 'no_show'])
  status: string;
}
