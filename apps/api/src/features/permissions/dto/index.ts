import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export const ALL_PERMISSIONS = [
  'courses:read',
  'courses:write',
  'courses:publish',
  'students:read',
  'students:manage_devices',
  'enrollments:read',
  'enrollments:write',
  'assignments:read',
  'assignments:write',
  'assignments:grade',
  'tests:read',
  'tests:write',
  'tests:grade',
  'payments:read',
  'payments:refund',
  'doubt_sessions:manage',
  'queries:read',
  'queries:reply',
  'reports:read',
  'reports:export',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export class SetPermissionsDto {
  @IsUUID()
  user_id: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class PromoteUserDto {
  @IsOptional()
  @IsIn(['sub_admin', 'admin'])
  role?: 'sub_admin' | 'admin';
}
