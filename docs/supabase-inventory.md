# Supabase Database Inventory

Generated: 2026-08-17  
Source: migrations 001–006 + application code analysis

Classification legend:
- **REQUIRED** — Core table with active application code referencing it
- **USED** — Referenced in application code (backend or frontend)
- **UNUSED** — Present in migrations, no application code references it
- **OBSOLETE** — Created in error or superseded by another object
- **DUPLICATE** — Functionally duplicates another object
- **UNKNOWN** — Cannot determine usage without live DB inspection

---

## TABLES

| Table | Migration | Classification | Notes |
|-------|-----------|----------------|-------|
| `profiles` | 001 | REQUIRED | Core user table. Used by auth.service, all modules via JOIN |
| `devices` | 001 | REQUIRED | Session tracking. auth.service extensively used for device limit + session management |
| `audit_logs` | 001 | USED | Written by `AuditLogInterceptor`. Not yet read from frontend but referenced in backend |
| `sub_admin_permissions` | 001, 005 | USED | Permissions module creates/reads/updates. Used by PermissionGuard |
| `categories` | 001 | REQUIRED | CategoriesService full CRUD. Admin frontend reads/creates/deletes |
| `courses` | 001 | REQUIRED | CoursesService full CRUD. Admin and public frontend both use |
| `chapters` | 001 | REQUIRED | ChaptersService full CRUD. Admin frontend uses |
| `lessons` | 001 | REQUIRED | LessonsService full CRUD. Admin frontend uses |
| `video_lessons` | 001 | USED | Table exists, referenced in types. No dedicated CRUD endpoints yet; schema ready for Vimeo integration |
| `pdf_notes` | 001 | USED | Table exists, referenced in types. No dedicated CRUD endpoints yet; schema ready for file upload |
| `assignments` | 001 | USED | Table exists, referenced in types. No dedicated endpoints yet; schema ready |
| `tests` | 001 | USED | Table exists, referenced in types. No dedicated endpoints yet; schema ready |
| `questions` | 001 | USED | Table exists, referenced in types. No dedicated endpoints yet |
| `question_options` | 001 | USED | Table exists, referenced in types. No dedicated endpoints yet |
| `test_attempts` | 001 | USED | Table exists, referenced in types. No dedicated endpoints yet |
| `test_answers` | 001 | USED | Table exists, referenced in types. No dedicated endpoints yet |
| `enrollments` | 001, 004 | REQUIRED | EnrollmentsService full CRUD. Admin frontend uses. EnrollmentGuard uses |
| `progress` | 001, 004 | REQUIRED | ProgressService full CRUD. Used for video resume and completion tracking |
| `assignment_submissions` | 001 | USED | Table exists, referenced in types. No dedicated endpoints yet |
| `payments` | 001, 004 | REQUIRED | PaymentsService full CRUD. Razorpay order + verify + webhook |
| `referral_codes` | 001 | UNUSED | No referral endpoints or frontend. Referral system not yet implemented |
| `referral_config` | 001 | UNUSED | No referral endpoints or frontend |
| `referrals` | 001 | UNUSED | No referral endpoints or frontend |
| `referral_commissions` | 001 | UNUSED | No referral endpoints or frontend |
| `referral_discounts_applied` | 001 | UNUSED | No referral endpoints or frontend |
| `doubt_slots` | 001, 006 | REQUIRED | DoubtSessionsService creates slots. Admin frontend creates/lists. Student frontend books |
| `doubt_bookings` | 001, 006 | REQUIRED | DoubtSessionsService creates bookings. Student frontend books/views |
| `sessions` | 003 | UNUSED | Created in migration 003 as an audit sessions table. Application code uses `devices` table for session management, not this table. No backend service or controller references it. |

---

## ENUMS

| Enum | Classification | Notes |
|------|----------------|-------|
| `user_role` (`admin`, `sub_admin`, `student`) | REQUIRED | Used in profiles table, get_my_role() function |
| `device_platform` (`web`, `android`, `ios`) | REQUIRED | Used in devices table |
| `course_status` (`draft`, `published`, `archived`) | REQUIRED | Used in courses table |
| `lesson_type` (`video`, `pdf`, `assignment`, `test`) | REQUIRED | Used in lessons table |
| `enrollment_status` (`active`, `completed`, `expired`) | REQUIRED | Used in enrollments table |
| `progress_status` (`not_started`, `in_progress`, `completed`) | REQUIRED | Used in progress table |
| `payment_status` (`pending`, `completed`, `failed`, `refunded`) | REQUIRED | Used in payments table |
| `referral_status` (`pending`, `converted`, `expired`) | UNUSED | Only used in referrals table which is unused |
| `commission_status` (`pending`, `approved`, `paid`, `rejected`) | UNUSED | Only used in referral_commissions table which is unused |
| `booking_status` (`confirmed`, `cancelled`, `completed`, `no_show`) | REQUIRED | Used in doubt_bookings table |

---

## FUNCTIONS

| Function | Classification | Notes |
|----------|----------------|-------|
| `public.handle_updated_at()` | REQUIRED | Trigger function used by updated_at triggers on profiles, courses, payments, sub_admin_permissions, progress, doubt_slots |
| `public.handle_new_user()` | REQUIRED | Trigger on `auth.users` INSERT — creates profile automatically. Required for user registration flow |
| `public.get_my_role()` | REQUIRED | Used by multiple RLS policies to check current user role |
| `update_updated_at()` | DUPLICATE | Created in migration 004. Functionally identical to `handle_updated_at()`. Both exist in DB |

---

## TRIGGERS

| Trigger | Table | Function | Classification | Notes |
|---------|-------|----------|----------------|-------|
| `on_auth_user_created` | `auth.users` | `handle_new_user` | REQUIRED | Creates profile on registration |
| `profiles_updated_at` | `profiles` | `handle_updated_at` | REQUIRED | Auto-updates updated_at |
| `courses_updated_at` | `courses` | `handle_updated_at` | REQUIRED | Auto-updates updated_at |
| `payments_updated_at` | `payments` | `handle_updated_at` | REQUIRED | Auto-updates updated_at |
| `sub_admin_permissions_updated_at` | `sub_admin_permissions` | `handle_updated_at` | REQUIRED | Auto-updates updated_at |
| `progress_updated_at` | `progress` | `handle_updated_at` | REQUIRED | Auto-updates updated_at |
| `enrollments_updated_at` | `enrollments` | `update_updated_at` | REQUIRED | Auto-updates updated_at (migration 004) |
| `sub_admin_permissions_updated_at` | `sub_admin_permissions` | `update_updated_at` | DUPLICATE | Migration 005 recreates same trigger using different function. Potential conflict. |
| `doubt_slots_updated_at` | `doubt_slots` | `update_updated_at` | REQUIRED | Auto-updates updated_at (migration 006) |

---

## RLS POLICIES

### profiles
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Users read own profile` | SELECT | REQUIRED |
| `Admin reads all profiles` | SELECT | REQUIRED |
| `Users update own profile` | UPDATE | REQUIRED |
| `Admin update any profile` | UPDATE | REQUIRED |

### devices
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Users manage own devices` | ALL | REQUIRED |
| `Admin reads all devices` | SELECT | REQUIRED |

### courses (RLS enabled in migration 001)
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Anyone reads published courses` | SELECT | REQUIRED |
| `Admin manages courses` | ALL | REQUIRED |

Note: Backend uses SUPABASE_ADMIN (service role) which bypasses RLS for all write operations.

### chapters
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Enrolled students read published chapters` | SELECT | REQUIRED |
| `Admin manages chapters` | ALL | REQUIRED |

### lessons
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Enrolled students read published lessons` | SELECT | REQUIRED |
| `Admin manages lessons` | ALL | REQUIRED |

### video_lessons
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Enrolled students read video lessons` | SELECT | REQUIRED |
| `Admin manages video lessons` | ALL | REQUIRED |

### pdf_notes
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Enrolled students read pdf notes` | SELECT | REQUIRED |
| `Admin manages pdf notes` | ALL | REQUIRED |

### enrollments
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Students read own enrollments` (migration 001) | SELECT | DUPLICATE |
| `Admin reads all enrollments` (migration 001) | SELECT | DUPLICATE |
| `Admin inserts enrollments` (migration 001) | INSERT | DUPLICATE |
| `Admin updates enrollments` (migration 001) | UPDATE | DUPLICATE |
| `Admin deletes enrollments` (migration 001) | DELETE | DUPLICATE |
| `enrollments_student_select` (migration 004) | SELECT | DUPLICATE |
| `enrollments_service_all` (migration 004) | ALL | REQUIRED |

Note: Migration 001 and 004 both create policies on enrollments. Migration 004's `enrollments_service_all` using `auth.role() = 'service_role'` is the effective one for backend writes.

### progress
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Students manage own progress` (migration 001) | ALL | DUPLICATE |
| `Admin reads all progress` (migration 001) | SELECT | DUPLICATE |
| `progress_student_select` (migration 004) | SELECT | DUPLICATE |
| `progress_student_update` (migration 004) | UPDATE | DUPLICATE |
| `progress_service_all` (migration 004) | ALL | REQUIRED |

### payments
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Students read own payments` (migration 001) | SELECT | DUPLICATE |
| `Admin reads all payments` (migration 001) | SELECT | DUPLICATE |
| `payments_student_select` (migration 004) | SELECT | DUPLICATE |
| `payments_service_all` (migration 004) | ALL | REQUIRED |

### sessions (migration 003)
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Users read own sessions` | SELECT | UNUSED — table not used |
| `Admin full access sessions` | ALL | UNUSED — table not used |

### doubt_slots (migration 001 + 006)
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Anyone reads available slots` (migration 001) | SELECT | DUPLICATE |
| `Admin manages slots` (migration 001) | ALL | DUPLICATE |
| `doubt_slots_service_all` (migration 006) | ALL | REQUIRED |
| `doubt_slots_read` (migration 006) | SELECT | REQUIRED |

### doubt_bookings
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Students manage own bookings` (migration 001) | ALL | DUPLICATE |
| `Admin manages all bookings` (migration 001) | ALL | DUPLICATE |
| `doubt_bookings_service_all` (migration 006) | ALL | REQUIRED |
| `doubt_bookings_student_select` (migration 006) | SELECT | REQUIRED |

### referral_codes / referrals / referral_commissions
| All policies | Classification |
|-------------|----------------|
| All | UNUSED — referral system not implemented |

### audit_logs
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `Admin reads audit logs` | SELECT | USED |

### test_attempts, assignment_submissions
| Policy | Operation | Classification |
|--------|-----------|----------------|
| All | USED — tables exist, endpoints not yet implemented |

### sub_admin_permissions
| Policy | Operation | Classification |
|--------|-----------|----------------|
| `sub_admin_permissions_service_all` (migration 005) | ALL | REQUIRED |

---

## INDEXES

All indexes from migration 003 are **REQUIRED** (performance-relevant for existing queries).

Key indexes:
- `idx_devices_user_id` — used frequently by auth device count queries
- `idx_courses_status`, `idx_courses_category_id` — used by course listing filters
- `idx_enrollments_student_id`, `idx_enrollments_course_id` — used by enrollment lookups
- `idx_payments_student_id`, `idx_payments_status` — used by payment queries
- `idx_progress_student_id`, `idx_progress_lesson_id` — used by progress queries
- `idx_doubt_slots_date`, `idx_doubt_bookings_student_id` — used by doubt session queries

---

## EXTENSIONS

No custom PostgreSQL extensions beyond the default Supabase set (uuid-ossp, pg_graphql, pg_stat_statements, pgcrypto, etc.) are explicitly installed in migrations.

---

## STORAGE BUCKETS

No storage buckets are defined in migrations. Storage buckets for PDFs and thumbnails would be configured directly in Supabase Dashboard. Application code references file paths (stored as text in `pdf_notes.file_path`, `profiles.avatar_url`, etc.) but no migration creates buckets.

---

## DUPLICATE/CONFLICT ISSUES

1. **`handle_updated_at` vs `update_updated_at`** — Migration 001 creates `handle_updated_at()`, migration 004 creates `update_updated_at()`. Both do the same thing. The triggers created in migrations 004, 005, 006 use `update_updated_at()`. This is redundant but not harmful.

2. **Policy duplication across migrations** — Migrations 001 and 004 both create RLS policies on `enrollments`, `progress`, `payments`. When both are applied in sequence, both sets exist. PostgreSQL allows multiple policies per table, so they coexist. The service_role policies in migration 004 are the effective ones for backend writes.

3. **sub_admin_permissions trigger** — Migration 001 creates `sub_admin_permissions_updated_at` using `handle_updated_at()`. Migration 005 creates the same trigger name using `update_updated_at()`. This would cause a conflict on fresh migration application — the second `CREATE TRIGGER` would fail if the trigger already exists. Migration 005 should use `DROP TRIGGER IF EXISTS` first.
