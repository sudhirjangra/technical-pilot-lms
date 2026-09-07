import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class CompleteProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  full_name: string;

  @ApiProperty()
  @IsString()
  @MinLength(10, { message: 'Phone number must be at least 10 digits' })
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Enter a valid phone number (e.g. +919876543210)' })
  phone: string;
}