import { z } from 'zod';

/**
 * Schema representing a user object (aligned with profiles table).
 */
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'sub_admin', 'student']),
  full_name: z.string().nullish(),
  phone: z.string().nullish(),
  avatar_url: z.string().nullish(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

/**
 * Schema for a response containing a single user.
 */
export const GetUserSchema = z.object({
  data: UserSchema,
});
export type GetUser = z.infer<typeof GetUserSchema>;

/**
 * Schema for a response containing multiple users.
 */
export const GetAllUsersSchema = z.object({
  data: z.array(UserSchema),
});
export type GetAllUsers = z.infer<typeof GetAllUsersSchema>;
