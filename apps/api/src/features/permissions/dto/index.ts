import { ArrayNotEmpty, IsArray, IsString, IsUUID } from 'class-validator';

export const ALL_PERMISSIONS = [
  'courses:read', 'courses:write', 'courses:publish',
  'students:read', 'students:manage_devices',
  'payments:read', 'payments:refund',
  'doubt_sessions:manage',
  'reports:read', 'reports:export',
  'referrals:read', 'referrals:approve',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export class SetPermissionsDto {
  @IsUUID()
  user_id: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions: string[];
}
