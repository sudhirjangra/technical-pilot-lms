import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVideoLessonDto {
  @ApiProperty()
  @IsUUID()
  lesson_id: string;

  @ApiProperty({
    description: 'VdoCipher video ID from dashboard or upload API',
  })
  @IsString()
  @MaxLength(100)
  vdocipher_video_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail_url?: string;
}
export class UpdateVideoLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vdocipher_video_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail_url?: string;
}