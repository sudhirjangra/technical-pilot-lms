import { IsBoolean } from 'class-validator';

export class BanDeviceDto {
  @IsBoolean()
  is_banned: boolean;
}
