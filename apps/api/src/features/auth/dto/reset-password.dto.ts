import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString({
    message: 'Identifier must be a string',
  })
  identifier: string;

  @ApiProperty()
  @IsString({
    message: 'Reset Token must be a string',
  })
  @MinLength(6, { message: 'Reset Token must be at least 6 characters' })
  @MaxLength(8, { message: 'Reset Token must be at most 8 characters' })
  resetToken: string;

  @ApiProperty()
  @IsString({
    message: 'New password must be a string',
  })
  newPassword: string;
}
