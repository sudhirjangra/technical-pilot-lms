import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  full_name: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  date_of_birth: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(10, { message: 'Phone number must be at least 10 digits' })
  phone: string;
}
