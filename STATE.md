# Project State

`STATE.md` is the only execution queue for coding agents. Work on exactly one item under `Immediate Next Step`, then stop after focused validation and update this file.

## Status At A Glance

### Done

- Authentication, authorization, course/content, enrollment, payment processing, notifications, doubt sessions, progress, analytics, and responsive student/admin flows are implemented.
- MongoDB-backed assignment/test attempt snapshots, ownership-safe attempt history, submission consistency, unlimited attempts, and attempt display are implemented.
- Manual grading has been removed from the frontend and backend; calculated marks remain authoritative.
- Contact support, flexible two-to-four option imports, DOB removal, touch-device cursor handling, admin revenue removal, and payment money-deduction safeguards are implemented.
- Supabase migrations through `017_contact_queries_support.sql` are present in the repository. Applying migrations remains an environment operation.

### Pending

- **Current active task:** `TP-ANALYSIS-001 - Question categorization`.
- All unchecked requirements in **Pending Requirements Queue** remain pending. They must be promoted one at a time into `Immediate Next Step`.
- The final verification checklist remains open until the corresponding behavior is verified end to end, even where implementation work is already recorded above.

Detailed requirements and acceptance criteria are preserved in the **Technical Pilot Portal - Master Implementation Specification** section of `LMS_ROADMAP.md`. The IDs below are the source-of-truth references for that specification.

## Completed Baseline

- Authentication, email confirmation, password recovery, Google sign-in, device limits, session management, and role routing are implemented.
- Admin and sub-admin RBAC, permission storage, permission guards, and permission-aware content/student/payment actions are implemented.
- Course, category, chapter, lesson, video, PDF, assignment, test, question-bank import, grading, enrollment, payment, notification, doubt-session, progress, and analytics flows are implemented in the current codebase.
- VdoCipher OTP playback, watermarking, concurrent playback checks, private PDF proxying, Supabase course media uploads, Razorpay verification/webhooks, and responsive admin/student UX are implemented.
- Student and admin assessment attempt history, progress inspection, access-revoked handling, and the combined attempts page are implemented as the current baseline. Manual grading is no longer part of the current implementation.
- Migrations through `017_contact_queries_support.sql` have been written in the repository. Applying database migrations is an environment operation, not a coding task.
- [x] **TP-DISCOVERY-001 - Inspect affected flows and define migration boundaries**
  - **Inspected Code Paths**:
    - Submission & History: `apps/api/src/features/assignments/` and `apps/api/src/features/tests/` (controllers, services, DTOs), `apps/web/server/student/{assignments,tests}.server.ts`, `apps/web/components/dashboard/attempts-client.tsx`, `apps/web/components/dashboard/attempts-history-client.tsx`, `apps/web/components/admin/student-detail-client.tsx`.
    - Progress & Analytics: `apps/api/src/features/progress/` and `apps/api/src/features/analytics/`.
    - Enrollments, Payments, Doubt Sessions, Notifications: `apps/api/src/features/{enrollments,payments,doubt-sessions,notifications}/`.
  - **Current Supabase Attempt Tables & Schema**:
    - `assignment_attempts` / `test_attempts`: `id`, `student_id`, `assignment_id` / `test_id`, `started_at`, `completed_at`, `score`, `max_score`, `time_spent_seconds`, `created_at`, `updated_at`.
    - `assignment_answers` / `test_answers`: `id`, `attempt_id`, `question_id`, `selected_option_id`, `text_answer`, `is_correct`, `time_spent_seconds`.
    - `assignment_answer_options` / `test_answer_options`: `assignment_answer_id` / `test_answer_id`, `option_id`.
    - `assessment_attempt_grants`: `id`, `student_id`, `assignment_id`, `test_id`, `extra_attempts`, `granted_by`.
    - Consumed Attempt Detail Fields: `id`, `student_id`, `student_name`, `student_email`, `assignment_id`/`test_id`, `started_at`, `completed_at`, `score`, `max_score`, `percentage`, `passed`, `time_spent_seconds`, `correctCount`, `totalCount`, `avgTimePerQuestion`, `topicBreakdown` (`topic`, `total`, `correct`, `totalTime`, `points`, `earnedPoints`), `questionReview` (`questionId`, `questionText`, `questionType`, `topic`, `isCorrect`, `timeSpentSeconds`, `points`, `pointsEarned`, `explanation`, `correctOptionIds`, `selectedOptionIds`, `correctOptionTexts`, `selectedOptionTexts`, `options`, `textAnswer`).
  - **MongoDB Configuration Status**:
    - MongoDB driver/ORM is not yet installed in `apps/api/package.json`.
    - Required packages: `mongodb` (or `@nestjs/mongoose` + `mongoose`).
    - Required environment variable: `MONGODB_URI` (and database name configuration).
    - Connection module: Dedicated NestJS module (`apps/api/src/common/modules/mongodb.module.ts`) providing a singleton database client connection with lifecycle hooks (`onModuleInit`, `onModuleDestroy`).
    - Deployment assumption: `MONGODB_URI` provided via environment variables in dev, staging, and production environments.

- [x] **TP-ARCH-001 - MongoDB for assignment/test attempt history**
  - Configured MongoDB connection module (`MongoModule` & `MongoService`) with connection pooling, lifecycle management, and index initialization (`attempt_id`, `student_id`, `assessment_id`, `created_at`).
  - Resolved MongoDB upsert operation by strictly isolating `$setOnInsert` (`created_at`) from `$set` (document body & `updated_at`).
  - Updated `AssignmentsService` and `TestsService` `submitAttempt` to freeze complete, self-contained attempt snapshots in MongoDB (storing full question text, options arrays with `id`, `text`, `isCorrect`, `isSelected`, student selections `selectedOptionIds`/`selectedOptionTexts`, correct options `correctOptionIds`/`correctOptionTexts`, points, explanations, scoring, and topic breakdown) so attempt history is completely immune to subsequent edits or deletions of questions/tests in Supabase.
  - Updated `getAssignmentAttemptDetail`, `getAttemptDetail`, `findAttemptForStudent`, and `getMyAttempts` across both services to prioritize MongoDB attempt snapshots as the authoritative store with fallback to Supabase for legacy records.
  - Added and verified unit test suites ([mongodb.service.spec.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/common/modules/mongodb.service.spec.ts), [assignments.service.spec.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.service.spec.ts), and [tests.service.spec.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.service.spec.ts)) with 11/11 tests passing and 0 TypeScript compilation errors.
- [x] **TP-DOUBT-001 through TP-DOUBT-004 - Course-based doubt sessions, targeting, and unified communications**
  - **TP-DOUBT-001**: Merged doubt sessions, notifications, and student query ticket management into a unified admin communications navigation workflow with cross-linking tabs.
  - **TP-DOUBT-002**: Added full targeting capabilities to doubt slots (`all`, `course`, and `student` modes) across backend DTOs, service methods, and frontend admin setup.
  - **TP-DOUBT-003**: Enforced course-based and 1-on-1 student access rules in `getUpcomingSlots` (active course enrollment filtering and 1-on-1 matching) and `bookSlot` authorization guards (blocking unauthorized bookings with `ForbiddenException`).
  - **TP-DOUBT-004**: Resolved admin slot creation by validating schedules, storing targeting references (`target_type`, `course_id`, `student_id`), providing meeting link inputs, and automatically dispatching targeted in-app notifications to eligible students upon slot creation.
  - **Schema & Hydration**: Created database migration `016_doubt_slots_targeting.sql` and implemented application-layer hydration (`hydrateSlots`) in `DoubtSessionsService` to eliminate any runtime dependence on PostgREST schema cache foreign-key embedding.
  - **Validation Performed**: Unit test suite `doubt-sessions.service.spec.ts` (8/8 passing tests covering targeting, notifications, course access filtering, and authorization guards) and clean TypeScript typechecks across `apps/api` and `apps/web`.

- [x] **TP-ADMIN-001 - Remove revenue from admin dashboard**
  - Removed Revenue card from Admin Dashboard (`AdminDashboardClient`) and balanced the metrics grid to 4 core student/course stats.
  - Preserved full payments audit logs and normal student purchases.
  - **Files Changed**: [admin-dashboard-client.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/admin/admin-dashboard-client.tsx).

- [x] **TP-UI-001 - Remove touch-device green cursor dot**
  - Updated `FollowCursor` in `@repo/shadcn` to detect touch/coarse devices (`pointer: coarse`, `hover: none`, and `maxTouchPoints > 0`) and bypass canvas dot initialization on touch screens while preserving the desktop cursor trail.
  - **Files Changed**: [follow-cursor.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/packages/shadcn/src/ui/follow-cursor.tsx).

- [x] **TP-PAY-001 & TP-PAY-002 - Remove refund option and money-deduction functions**
  - Removed `POST /payments/:id/refund` route and handler from `PaymentsController` and `PaymentsService`.
  - Removed `RefundPaymentDto` and revoked `payments:refund` permission from API and web permission groups.
  - Removed `refundPayment` server action and all refund manager UI dialog buttons and controls from `PaymentDetailDialog`.
  - Verified normal order creation, payment signature verification, webhook processing, and enrollment activation are untouched.
  - **Files Changed**: [payments.controller.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/payments/payments.controller.ts), [payments.service.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/payments/payments.service.ts), [dto/index.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/payments/dto/index.ts), [permissions/dto/index.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/permissions/dto/index.ts), [permission-groups.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/lib/permission-groups.ts), [payments.server.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/server/admin/payments.server.ts), [payment-detail-dialog.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/admin/payment-detail-dialog.tsx).

- [x] **TP-ATT-001 & TP-ATT-002 - Unlimited attempts and attempt display**
  - Updated `CreateTestDto`, `UpdateTestDto`, `CreateAssignmentDto`, and `UpdateAssignmentDto` to permit `max_attempts = 0` (unlimited).
  - Enhanced student assessment attempt display in `test-viewer.tsx` to clearly distinguish between unlimited attempts (showing `{attemptsUsed} used`) and limited attempts (showing `{attemptsUsed} / {maxAttempts}` with remaining attempts), without displaying `0` or `infinity` as total limits.
  - **Files Changed**: [tests/dto/index.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/tests/dto/index.ts), [assignments/dto/index.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/assignments/dto/index.ts), [test-viewer.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/dashboard/test-viewer.tsx).

- [x] **TP-STUDENT-002 - Remove DOB entirely**
  - Completely removed Date of Birth from `SignUpForm`, `CompleteProfileForm`, user types (`UserSchema`, NextAuth `User`), `auth.ts`, `jwtCallback`, `sessionCallback`, `middleware.ts`, student profile view, backend auth DTOs (`CreateUserDto`, `CompleteProfileDto`, `GoogleSignInResponseDto`), and backend services (`AuthService`, `UsersService`, `AnalyticsService`).
  - **Files Changed**: [sign-up.form.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/auth/form/sign-up.form.tsx), [complete-profile.form.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/auth/form/complete-profile.form.tsx), [complete-profile/page.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/app/auth/complete-profile/page.tsx), [profile/page.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/app/profile/page.tsx), [auth.type.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/types/auth.type.ts), [user.type.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/types/user.type.ts), [type.d.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/types/type.d.ts), [auth.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/auth.ts), [jwt-callback.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/lib/auth/jwt-callback.ts), [session-callback.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/lib/auth/session-callback.ts), [middleware.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/middleware.ts), [auth.server.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts), [create-user.dto.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/auth/dto/create-user.dto.ts), [complete-profile.dto.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/auth/dto/complete-profile.dto.ts), [google-signin.dto.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/auth/dto/google-signin.dto.ts), [auth.service.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/auth/auth.service.ts), [users.service.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/users/users.service.ts), [analytics.service.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/analytics/analytics.service.ts).

- [x] **TP-SUPPORT-001 & TP-SUPPORT-002 - Contact Us link and Contact form**
  - Added public contact endpoint `POST /student-queries/contact` with `CreateContactQueryDto` (name, email, phone, message, subject) and admin notifications in `StudentQueriesService`.
  - Created migration `017_contact_queries_support.sql` allowing nullable `student_id` for guest inquiries.
  - Created public `/contact` page and responsive `ContactForm` component with validation and success ticket feedback.
  - Added Contact Support / Contact Us links to sign-in and sign-up pages usable before authentication.
  - **Files Changed**: [student-queries.controller.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/student-queries/student-queries.controller.ts), [student-queries.service.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/student-queries/student-queries.service.ts), [student-queries/dto/index.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/student-queries/dto/index.ts), [017_contact_queries_support.sql](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/packages/supabase/migrations/017_contact_queries_support.sql), [student-queries.server.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts), [contact/page.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/app/contact/page.tsx), [contact-form.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/contact/contact-form.tsx), [sign-in.form.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/auth/form/sign-in.form.tsx), [sign-up.form.tsx](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/web/components/auth/form/sign-up.form.tsx).

- [x] **TP-IMPORT-001 - Flexible two-to-four option imports**
  - Verified `question-import.util.ts` cleanly accepts questions with 2, 3, or 4 options when option fields C/D are empty/omitted and maps only options with values while preserving answer keys.
  - Added unit test suite `question-import.util.spec.ts` (4/4 passing tests).
  - **Files Changed**: [question-import.util.spec.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/common/utils/question-import.util.spec.ts).

- [x] **TP-ARCH-004 - Attempt-history API and fetching**
  - Exposed student attempt detail endpoints `GET /assignments/student/attempts/:attemptId` and `GET /tests/student/attempts/:attemptId` with strict student ownership guards (`findAttemptForStudent`).
  - Standardized attempt lookup flow in `AssignmentsService` and `TestsService`: retrieves authoritative snapshot document from MongoDB, validates student ownership (throws `ForbiddenException` if mismatched), falls back gracefully to Supabase with automatic lazy MongoDB caching, and throws `NotFoundException` when attempt ID is nonexistent.
  - Verified response format compatibility across student test viewer, attempts history, and admin analytics screens (`id`, `assignment_id`/`test_id`, `student_id`, `student_name`, `student_email`, `score`, `max_score`, `maxScore`, `percentage`, `passed`, `time_spent_seconds`, `totalTimeSeconds`, `correctCount`, `totalCount`, `avgTimePerQuestion`, `topicBreakdown`, `questionReview`).
  - Added comprehensive ownership enforcement, invalid attempt, and fallback unit tests to `assignments.service.spec.ts` and `tests.service.spec.ts` (34/34 tests passing across all active API test suites).
  - **Files Changed**: [assignments.service.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.service.ts), [assignments.controller.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.controller.ts), [assignments.service.spec.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.service.spec.ts), [tests.service.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.service.ts), [tests.controller.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.controller.ts), [tests.service.spec.ts](file:///C:/Users/sudjangr/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.service.spec.ts).

- [x] **TP-ARCH-005 - Remove manual-grading data dependencies**
  - Removed manual-grading pending status (`isCorrect = null`) from text question evaluation in `AssignmentsService` and `TestsService` `submitAttempt`, auto-awarding points when text is submitted without a predefined answer key.
  - Made MongoDB the authoritative source in `getMyAttempts` across both assignments and tests, preventing Supabase reference values (like score `0` or un-graded status) from overwriting MongoDB score, percentage, and passed states.
  - Updated `gradeAttemptAnswers` in both `AssignmentsService` and `TestsService` to synchronize recalculated question reviews, topic breakdowns, and scores into the authoritative MongoDB attempt document alongside Supabase.
  - Updated `AttemptMigrationService` to prioritize calculated non-zero scores over stale `0` scores in legacy Supabase attempts.
  - Replaced manual grading UI copy in `test-viewer.tsx` and `course-detail-client.tsx`.
  - **Files Changed**: [assignments.service.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.service.ts), [tests.service.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.service.ts), [attempt-migration.service.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/common/services/attempt-migration.service.ts), [test-viewer.tsx](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/test-viewer.tsx), [course-detail-client.tsx](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx).

- [x] **TP-ARCH-006 - Submission and attempt-history consistency**
  - Ensured deterministic submission consistency in `AssignmentsService` and `TestsService`: verified attempt completion guard preventing duplicate submission calls, synchronized MongoDB complete snapshots, Supabase attempt reference updates, and immediate assessment and lesson completion progress status sync via `syncLessonCompletion`.
  - Added unit test suite in `assignments.service.spec.ts` verifying atomic submission flow: single attempt creation, MongoDB document generation, score persistence, and immediate lesson completion status.
  - **Files Changed**: [assignments.service.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.service.ts), [tests.service.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.service.ts), [assignments.service.spec.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.service.spec.ts).

- [x] **TP-ARCH-002 - Remove manual grading entirely**
  - Removed manual-grading controls, actions, state, and badges from the web application (in `student-detail-client.tsx`, removed `gradingState`, `handleGrade`, "Needs grading" badge, Grade action buttons, and "Save Grades" footer).
  - Removed manual-grading server actions `gradeAttemptAnswers`, `gradeAssignmentAttempt`, and `gradeTestAttempt` from `students.server.ts`, `assignments.server.ts`, and `tests.server.ts`.
  - Removed manual-grading endpoints `PATCH /assignments/attempts/:attemptId/grade` and `PATCH /tests/attempts/:attemptId/grade` from `assignments.controller.ts` and `tests.controller.ts`.
  - Removed `gradeAttemptAnswers` methods from `AssignmentsService` and `TestsService`.
  - Removed `GradeAttemptDto` and `GradeItemDto` classes from assignments and tests DTO modules.
  - Removed `assignments:grade` and `tests:grade` permission slugs from `ALL_PERMISSIONS` and frontend `permission-groups.ts`.
  - Verified calculated marks remain authoritative and immutable via unit test suites and typechecks.
  - **Files Changed**: [student-detail-client.tsx](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/student-detail-client.tsx), [students.server.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/students.server.ts), [assignments.server.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts), [tests.server.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts), [assignments.controller.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.controller.ts), [tests.controller.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.controller.ts), [assignments.service.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/assignments/assignments.service.ts), [tests.service.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/tests/tests.service.ts), [dto/index.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/assignments/dto/index.ts), [dto/index.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/tests/dto/index.ts), [permissions/dto/index.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/api/src/features/permissions/dto/index.ts), [permission-groups.ts](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/lib/permission-groups.ts).

## Immediate Next Step

- [ ] **TP-ANALYSIS-001 - Question categorization**
  - Questions must support course/subject, topic, subtopic/section, question type such as calculation/reasoning/numerical/other, and difficulty values easy/medium/hard.
  - Persist the fields for assignment and test questions, expose them in admin creation/edit/import flows, and preserve existing questions when fields are absent.
  - Acceptance: questions retain categorized metadata across creation, update, and bulk import without breaking existing assessment flows.

## Pending Requirements Queue

Only unchecked items in this section are pending. Checked items are retained as historical acceptance criteria and are not active work.

Promote only the next unchecked task to `Immediate Next Step`. Do not implement multiple queue items in one session. The full requirements below are intentionally preserved; do not replace them with a UI-only approximation or a short summary.

### Attempt History and Grading

- [x] **TP-ARCH-004 - Attempt-history API and fetching**

  - Use the Supabase attempt ID to fetch the corresponding MongoDB attempt. Keep the API response compatible with existing student and admin screens.
  - Handle missing IDs, invalid references, unavailable MongoDB records, and mismatched ownership with safe understandable responses.
  - Prevent Student A from reading Student B's attempt history. Preserve behavior after multiple submissions and do not return incorrect scores.
  - Acceptance: all valid attempts load, invalid references fail safely, ownership is enforced, repeated submissions remain accurate, and existing screens continue working.

- [x] **TP-ARCH-005 - Remove manual-grading data dependencies**
  - Identify every database field, API path, service, background operation, and frontend path related to manual grading.
  - Remove or update logic that resets marks after submission, resets scores to zero, changes a passed test to incorrect, overwrites calculated marks, or depends on manual-grading status for display.
  - Make the MongoDB attempt result authoritative for submitted results. Supabase reference rows must not contain conflicting score/status values that override it.
  - Acceptance: no manual-grading dependency remains in submission, marks are not reset, passed tests remain passed, statuses match the actual result, and stale Supabase values cannot overwrite MongoDB results.

- [x] **TP-ARCH-006 - Submission and attempt-history consistency**
  - On submission: validate input, determine attempt number, generate a unique ID, calculate result, store the complete MongoDB attempt, store the Supabase reference, update assessment status from the actual result, return the result, and make history immediately readable.
  - Ensure exactly one attempt record is created. A failed request must not create misleading completed/pass state, and retrying a failed request must not create duplicates.
  - Acceptance: unique attempt, successful MongoDB write, correct Supabase reference, immediate history access, stable marks after refresh, and correct failure behavior.

- [x] **TP-ARCH-002 - Remove manual grading entirely**
  - Remove manual-grading controls from the web application and manual-grading APIs, services, and backend logic.
  - Do not allow any manual action to overwrite a calculated score. A completed or passed test must never show zero merely because a manual-grading path previously ran.
  - Acceptance: manual grading is absent from frontend and backend, submitted marks remain correct, assignment/test status matches stored results, and existing attempts are not corrupted.

- [x] **TP-ATT-001 - Unlimited attempts**
  - Treat configured `attempts = 0` as unlimited. A value greater than zero permits only that many attempts.
  - Enforce the rule in the backend; reopening or refreshing must not bypass a positive limit; preserve all attempt history.
  - Acceptance: zero allows unlimited attempts, three allows three, server enforcement is authoritative, and existing history remains intact.

- [x] **TP-ATT-002 - Attempt display**
  - When unlimited, show only attempts used/tried. Do not display `0`, infinity, or `0 remaining` as a total limit.
  - When limited, show configured limit and meaningful used/remaining information.

### Student Analysis

- [ ] **TP-ANALYSIS-001 - Question categorization**
  - Questions must support course/subject, topic, subtopic/section, question type such as calculation/reasoning/numerical/other, and difficulty values easy/medium/hard.
  - Persist the fields for assignment and test questions, expose them in admin creation/edit/import flows, and preserve existing questions when fields are absent.

- [ ] **TP-ANALYSIS-002 - Weak-point detection**
  - Analyze actual assignment/test attempt performance to identify weak topics, sections, question types, and difficulty levels.
  - Do not label a category weak based only on the number of questions. Use correct/incorrect results and meaningful performance calculations.

- [ ] **TP-ANALYSIS-003 - Student-facing analysis**
  - Show overall performance, weak topics/sections, weak question types, performance by difficulty, and suggestions for what to study or practice next.
  - Use the student's actual attempt data and protect access to only the owning student's analysis.

- [ ] **TP-ANALYSIS-004 - Relevant charts**
  - Use truthful charts such as topic-wise bar charts and appropriate pie/donut or other visualizations.
  - Charts must be derived from actual student data and must not imply unsupported conclusions.

### Notifications, Support, and Admin UX

- [ ] **TP-MKT-001 - Periodic course-status notifications**
  - If a student purchased course A out of A/B/C/D, periodically ask about the other courses without assuming the student has never studied them.

- [ ] **TP-MKT-002 - Notification targeting**
  - Admin must target all students, students enrolled in a specific course, or specific students.

- [ ] **TP-MKT-003 - Personalized course-interest form**
  - Notification navigation must open a personalized form about other subjects/courses. The form must allow the student to state that they completed the course already, study it elsewhere, have not started it, and/or provide other remarks.

- [ ] **TP-MKT-004 - Marketing data**
  - Store responses and remarks so admins can review them and target relevant campaigns. Do not interpret non-purchase as proof the student has never studied the course.

- [x] **TP-ADMIN-001 - Remove revenue from admin dashboard**
  - Remove revenue cards and related dashboard metrics only. Do not remove unrelated payment functionality, payment records, or normal student purchases.

- [x] **TP-SUPPORT-001 - Contact Us link**
  - Add a Contact Us/Support link to login and signup screens. It must be usable before authentication.

- [x] **TP-SUPPORT-002 - Contact form**
  - Collect name, email, mobile number, and query/message without requiring login. Add validation and clear success/error feedback.

- [x] **TP-DOUBT-001 - Merge notification and doubt-session management**
  - Organize doubt sessions and notifications into one clear, user-friendly admin workflow without losing existing booking behavior.

- [x] **TP-DOUBT-002 - Doubt-session targeting**
  - Allow sessions to target all students, students enrolled in a selected course, or specific students.

- [x] **TP-DOUBT-003 - Course-based access**
  - For a selected course, only enrolled students receive/access the session. For a selected student, only that student receives/access it.

- [x] **TP-DOUBT-004 - Fix admin creation**
  - Make the complete flow work: create, target, save, notify, and student access. Diagnose the current admin creation failure rather than hiding it in the UI.

- [ ] **TP-EMAIL-001 - Successful purchase receipt**
  - After successful purchase, send confirmation/receipt to the registered email confirming purchase and enrollment. Do not generate or attach a PDF.
  - Email failures must be handled gracefully and must not mark a successful purchase as failed.

### Identity and Referral Codes

- [ ] **TP-STUDENT-001 - Unique student ID**
  - Assign every student a unique student ID generated using their email and mobile number. Use the student ID as the primary student identifier throughout the portal instead of email.
  - Preserve existing student data and update references carefully. Do not make an unsafe identity migration or break existing enrollments, attempts, payments, or progress.

- [x] **TP-STUDENT-002 - Remove DOB**
  - Remove date of birth entirely from signup, student profiles, admin views, backend DTO/service handling, schemas, and other student forms.
  - Do not continue collecting DOB through hidden fields or compatibility-only form fields.

- [ ] **TP-STUDENT-003 - Unique referral code**
  - Assign every user a unique referral code beginning with `TP` followed by the required unique characters.
  - Every user must be able to view their referral code.

### Payment Safety

- [x] **TP-PAY-001 - Remove refund option**
  - Remove refund buttons, actions, backend endpoints, and services from admin payments. Do not merely hide the controls.

- [x] **TP-PAY-002 - Remove admin money-deduction functions**
  - Remove or disable every admin-side operation that could deduct money from the admin's Razorpay account, including refunds, reversals, transfers, payouts, and similar operations.
  - Verify direct API requests cannot trigger those operations. Normal student order creation, payment processing, signature verification, and enrollment activation must continue working.

### Course Access and Content

- [ ] **TP-ARCHIVE-001 - Archive notification**
  - When an admin archives a course, notify users that Technical Pilot/admin has archived it.

- [ ] **TP-ARCHIVE-002 - Revoke archived-course access**
  - Revoke access for all students, prevent enrolled and non-enrolled users from opening/viewing archived content, show a dimmed course tile with Archived status, and enforce restrictions in backend/API as well as UI.
  - Preserve historical enrollment, payment, progress, and attempt data.

- [x] **TP-IMPORT-001 - Flexible two-to-four option imports**
  - If option fields A/B/C/D contain empty values, accept the question and map only options with values. Support two, three, and four options.
  - Preserve correct-answer mapping and do not reject a question solely because optional option fields are empty.

- [ ] **TP-VIDEO-001 - Custom VdoCipher video thumbnail**
  - Allow an admin to upload and associate a custom thumbnail with the correct video. Show it to students before playback.
  - If no custom thumbnail exists, retain the existing fallback behavior.

- [ ] **TP-DESC-001 - Lesson and chapter descriptions**
  - Students must see lesson and chapter descriptions in appropriate views. Preserve supported formatting.

- [ ] **TP-DESC-002 - Course description editor**
  - Give admins the existing rich text editor used for relevant content. Pasted content must retain the same supported formatting.

- [ ] **TP-DESC-003 - Course details display**
  - Show the course description on the course details page before enrollment, in the area where Enroll Now information is shown.

- [x] **TP-UI-001 - Remove touch-device green cursor dot**
  - Remove the green cursor dot on touch/mobile devices while retaining desktop cursor behavior if it is part of the existing experience.

### Course Expiry and Subscriptions

- [ ] **TP-SUB-001 - No lifetime access**
  - Courses must not automatically grant lifetime access. Admin must configure fixed-duration access or subscription-based access.

- [ ] **TP-SUB-002 - Admin plan configuration**
  - Admin must configure expiry duration in days, subscription duration, subscription price, and available subscription plans. Support plans such as ₹5,000/3 months, ₹9,000/9 months, and ₹11,000/1 year without hardcoding those examples as the only choices.

- [ ] **TP-SUB-003 - Student access and expiry**
  - On enrollment/purchase, record access start date and calculate expiry. Show remaining days, revoke access when expired, and preserve progress.

- [ ] **TP-SUB-004 - Renewal**
  - Allow extension/renewal before and after expiry. Restore access, preserve progress, and avoid duplicate enrollments that disconnect progress.

- [ ] **TP-SUB-005 - Admin visibility**
  - Admin must see enrollment date, expiry date, remaining days, active/expired status, subscription plan, renewal history, and relevant payment/enrollment records.

- [ ] **TP-SUB-006 - Exceptional handling**
  - Define behavior for multiple purchases, renewal before/after expiry, multiple courses with different expiry dates, admin plan changes, payment success followed by access-update failure, expiry while viewing, direct access after expiry, and existing students enrolled before this feature.
  - Do not assume lifetime access for existing students without an explicit migration rule.

### Referral Credits and Manual Conversion

- [ ] **TP-REF-001 - Referral relationship**
  - Allow a new user to enter a referral code during signup and store the referral relationship safely.

- [ ] **TP-REF-002 - Referral reward**
  - When a referred user purchases a course, calculate a configurable percentage of the course purchase amount and award points/credits to the referring student.
  - Do not automatically transfer money.

- [ ] **TP-REF-003 - Referral tracking**
  - Users must see referral code, referred users, purchase status, points earned, points used/converted, and remaining balance.

- [ ] **TP-REF-004 - Manual cash conversion**
  - Let users request conversion of points into real money and collect required account details.
  - Admin must review and validate requests, manually send money directly, mark requests paid, and update remaining points.

- [ ] **TP-REF-005 - Conversion safety**
  - Prevent duplicate payment for the same points, preserve referral/conversion history, support partial conversion where applicable, do not deduct money automatically from Razorpay, and do not create an automatic payout flow.

## Final Verification Checklist

Do not mark the full specification complete until all of these are verified:

- [x] MongoDB attempt history works reliably and Supabase stores attempt references.
- [x] Manual grading is removed from frontend and backend without incorrect score resets.
- [x] Unlimited attempts and correct attempt display work.
- [ ] Weak-point analysis uses real attempt data.
- [x] Course-based doubt sessions and notifications work.
- [ ] Course expiry and renewal work without losing progress.
- [ ] Archived courses revoke access in frontend and backend.
- [x] Refund and admin money-deduction functionality cannot be triggered.
- [ ] Referral credits and manual conversion work safely.
- [ ] Existing data is preserved and important edge cases are tested.
- [ ] No unrelated functionality is broken.

Deliverables are updated frontend, backend, database migrations, and a clear verification summary mapped to every requirement ID.

## Handoff Rules

When the immediate task is complete and verified:

1. Mark that task `[x]` in its queue section.
2. Record only the files changed and focused validation performed.
3. Promote exactly one next task to `Immediate Next Step`.
4. Do not mark a parent task complete when only its UI, migration, or one side of the API is complete.
5. Do not reopen the completed baseline unless a new requirement explicitly changes it or a regression is found.