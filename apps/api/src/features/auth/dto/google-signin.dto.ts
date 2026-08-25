import { IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DeviceInfoDto {
  @IsString()
  @IsOptional()
  device_name?: string;

  @IsString()
  @IsOptional()
  platform?: string;
}

export class GoogleSignInDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  sub: string;

  @ValidateNested()
  @Type(() => DeviceInfoDto)
  @IsOptional()
  device_info?: DeviceInfoDto;
}

export class GoogleSignInResponseDto {
  message: string;
  data: {
    id: string;
    email: string;
    role: string;
    full_name: string | null;
    date_of_birth: string | null;
    phone: string | null;
    avatar_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    session_token: string;
    session_refresh_time: string;
  };
}