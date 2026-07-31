import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmEmailDto {
  @ApiProperty()
  @IsString()
  @MaxLength(8)
  @MinLength(6)
  token: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResendOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
