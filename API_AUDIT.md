# Technical Pilot LMS — API Reference & Usage Audit

This document provides a comprehensive audit and specification of all **156 endpoints** across **18 domains** exposed by the Technical Pilot LMS NestJS API (`http://localhost:8000/api-docs#`).

---

## 1. Executive Summary & Usage Breakdown

| Category | Endpoint Count | Description |
| :--- | :---: | :--- |
| 🟢 **Active (Web Application)** | **141** | Actively invoked by Next.js server actions, API routes, or React client components. |
| ⚙️ **Infrastructure / Health** | **5** | DevOps health probes (`@nestjs/terminus`) for uptime, database, memory, and disk monitoring. |
| 🔗 **External Webhook** | **1** | Server-to-server callback endpoint invoked directly by Razorpay payment gateway. |
| ⚠️ **Unused in Frontend** | **9** | Endpoints fully implemented in NestJS with active DB logic, but currently lacking UI or caller in `apps/web`. |
| **Total Endpoints** | **156** | |

---

## 2. Unused Endpoints Audit & Roadmap Recommendations

The following **9 endpoints** exist in the backend API but are **not called** anywhere in `apps/web`:

| # | Domain | Method & Path | Controller Method | Reason / Why Unused in Frontend | Recommended Action |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Analytics** | `GET /analytics/courses/{courseId}/chapters/{chapterId}` | `AnalyticsController.getChapterAnalytics` | Granular chapter drop-off analytics. The UI already fetches all chapters via `GET /analytics/courses/{id}`. | Keep for future deep-dive chapter analytics view. |
| **2** | **Analytics** | `GET /analytics/students/{studentId}/courses/{courseId}` | `AnalyticsController.getStudentCourseAnalytics` | Single student course progress drill-down. The student detail view uses `GET /analytics/students/{id}` and `GET /progress/student/{id}`. | Keep for dedicated student-per-course report. |
| **3** | **Assignments** | `GET /assignments/{id}/attempts` | `AssignmentsController.getAssignmentAttempts` | Admin endpoint to list all student attempts for an assignment. | Add "View All Attempts" table in Admin Assignment editor. |
| **4** | **Lessons** | `GET /lessons/chapter/{chapterId}` | `LessonsController.findByChapter` | Lessons list by chapter. The frontend loads lessons eagerly inside `GET /chapters/course/{courseId}`. | Keep as alternate lightweight endpoint or deprecate. |
| **5** | **Payments** | `GET /payments/my` | `PaymentsController.getMyPayments` | Student payment history & invoice list. Frontend student dashboard does not yet have a "Billing / Invoices" tab. | Wire into a new Student Dashboard "Billing" tab. |
| **6** | **Payments** | `POST /payments/{id}/refund` | `PaymentsController.refund` | Admin refund processing via Razorpay. The admin payments UI currently has a status filter for refunds but no action button. | Add a "Refund Payment" modal button in Admin Payments table. |
| **7** | **Tests** | `GET /tests/{id}/attempts` | `TestsController.getTestAttempts` | Admin endpoint to list all student attempts for a test. | Add "View All Attempts" table in Admin Test editor. |
| **8** | **Doubt Sessions** | `GET /doubt-sessions/slots/{id}/bookings` | `DoubtSessionsController.getSlotBookings` | Admin view of student bookings for a specific slot. Admin UI currently relies on the embedded `current_bookings` count. | Add "View Attendees" dialog on Admin doubt slot card. |
| **9** | **Doubt Sessions** | `PATCH /doubt-sessions/bookings/{id}` | `DoubtSessionsController.updateBooking` | Admin update booking status / meeting link. | Add manual booking reschedule / status update modal in Admin. |

---

## 3. Detailed Endpoint Specification by Feature Module

### 3.1 Domain: Analytics (7 Endpoints)

#### `GET` /analytics/overview

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AnalyticsController_getOverview`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Aggregates platform-wide KPIs: total registered students, active enrollments, total revenue, course completions, and daily/monthly enrollment trends.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/analytics.server.ts:59`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L59)

#### `GET` /analytics/courses/{courseId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AnalyticsController_getCourseAnalytics`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Fetches deep course analytics: revenue, enrolled student count, lesson progress distributions, average quiz scores, and chapter breakdown.
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/analytics.server.ts:105`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L105)
  - [`apps/web/server/admin/analytics.server.ts:116`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L116)

#### `GET` /analytics/courses/{courseId}/students

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AnalyticsController_getCourseStudents`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Returns paginated list of students enrolled in the course, along with individual completion percentage, last activity date, and test scores.
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/analytics.server.ts:116`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L116)

#### `GET` /analytics/courses/{courseId}/chapters/{chapterId}

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `AnalyticsController_getChapterAnalytics`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Returns granular analytics for a specific chapter: student start rate, completion rate, drop-off rate, and average time spent on chapter lessons.
- **Parameters**:
  - `courseId*` (path, string)
  - `chapterId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /analytics/students/{studentId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AnalyticsController_getStudentDetail`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Fetches comprehensive student analytics: courses enrolled, total watch time, overall completion rate, devices registered, and recent login sessions.
- **Parameters**:
  - `studentId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/analytics.server.ts:182`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L182)
  - [`apps/web/server/admin/analytics.server.ts:193`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L193)

#### `GET` /analytics/students/{studentId}/attempts

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AnalyticsController_getStudentAttempts`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Returns full assessment attempt history for a student across all quizzes, assignments, and mock tests with pass/fail marks.
- **Parameters**:
  - `studentId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/analytics.server.ts:193`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L193)

#### `GET` /analytics/students/{studentId}/courses/{courseId}

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `AnalyticsController_getStudentCourseDetail`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Returns detailed performance and progress metrics for a specific student in a specific course.
- **Parameters**:
  - `studentId*` (path, string)
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**: *None found in frontend codebase*


### 3.2 Domain: Assignments (18 Endpoints)

#### `POST` /assignments

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_create`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Creates a new assignment linked to a lesson. Validates that the target lesson is of type assignment.
- **Parameters**: None
- **Request Body**: **CreateAssignmentDto**: `lesson_id*` (string), `title*` (string), `instructions` (string), `max_score` (number), `due_days_after_start` (number), `time_limit_seconds` (number), `passing_score_percent` (number), `max_attempts` (number)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:148`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L148)
  - [`apps/web/server/admin/assignments.server.ts:215`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L215)
  - [`apps/web/server/admin/assignments.server.ts:298`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L298)
  - [`apps/web/server/student/assignments.server.ts:155`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L155)
  - [`apps/web/server/student/assignments.server.ts:168`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L168)

#### `GET` /assignments/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_findByLesson`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Fetches the assignment definition, questions, options, and settings for admin configuration and editing.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:128`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L128)

#### `PATCH` /assignments/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_update`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Updates assignment parameters: title, instructions, time limit, passing score percentage, max attempts, and due days after chapter start.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **UpdateAssignmentDto**: `title` (string), `instructions` (string), `max_score` (number), `due_days_after_start` (number), `time_limit_seconds` (number), `passing_score_percent` (number), `max_attempts` (number)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:173`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L173)
  - [`apps/web/server/admin/assignments.server.ts:246`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L246)
  - [`apps/web/server/admin/assignments.server.ts:280`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L280)
  - [`apps/web/server/admin/assignments.server.ts:319`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L319)
  - [`apps/web/server/student/assignments.server.ts:183`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L183)

#### `DELETE` /assignments/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_remove`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Permanently deletes an assignment, cascading to its questions, options, student attempts, and answer records.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:187`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L187)
  - [`apps/web/server/admin/assignments.server.ts:262`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L262)

#### `POST` /assignments/{id}/questions

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_createQuestion`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Adds a question (MCQ, MSQ, or text) to an assignment with explanation, points, question number, and answer options.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **CreateAssignmentQuestionDto**: `question_text*` (string), `question_type*` (string), `points` (number), `explanation` (string), `sort_order` (number), `question_number` (number), `correct_text_answer` (string), `topic` (string), `options` (array)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:215`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L215)

#### `PATCH` /assignments/questions/{questionId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_updateQuestion`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Updates question text, type, point weight, topic, and associated choice options.
- **Parameters**:
  - `questionId*` (path, string)
- **Request Body**: **UpdateAssignmentQuestionDto**: `question_text` (string), `question_type` (string), `points` (number), `explanation` (string), `sort_order` (number), `question_number` (number), `correct_text_answer` (string), `topic` (string), `options` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:246`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L246)

#### `DELETE` /assignments/questions/{questionId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_removeQuestion`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Deletes a question and its options from the assignment.
- **Parameters**:
  - `questionId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:262`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L262)

#### `PATCH` /assignments/{id}/questions/reorder

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_reorderQuestions`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Batch reorders questions within an assignment using an array of question IDs and sort order numbers.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **ReorderAssignmentQuestionsDto**: `questions*` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:280`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L280)

#### `GET` /assignments/student/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_getAssignmentForStudentLesson`
- **Access Control**: Student / Enrolled (Guard: `JWT (Enrollment Guard)`)
- **Summary & Purpose**: Student entry point to an assignment. Verifies active course enrollment, strips correct answers, returns past attempts, and checks remaining attempt quota.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/assignments.server.ts:143`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L143)

#### `GET` /assignments/student/my-attempts

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_getMyAttempts`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Lists all past assignment attempts submitted by the authenticated student.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/assignments.server.ts:259`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L259)

#### `POST` /assignments/student/{assignmentId}/attempts

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_startAttempt`
- **Access Control**: Student / Enrolled (Guard: `JWT`)
- **Summary & Purpose**: Starts a new student attempt. Checks attempt quota against max_attempts + extra_attempt_grants. Returns attempt ID and starts timer.
- **Parameters**:
  - `assignmentId*` (path, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/assignments.server.ts:155`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L155)

#### `POST` /assignments/student/attempts/{attemptId}/submit

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_submitAttempt`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Submits an in-progress assignment attempt. Auto-evaluates MCQ/MSQ questions, records time spent, calculates total score and pass/fail, and updates progress.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: **SubmitAssignmentAttemptDto**: `answers*` (array)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/assignments.server.ts:168`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L168)

#### `PATCH` /assignments/student/attempts/{attemptId}/answers/{questionId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_saveAnswer`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Auto-saves intermediate answer for a question while the student is working on the assignment.
- **Parameters**:
  - `attemptId*` (path, string)
  - `questionId*` (path, string)
- **Request Body**: **SaveAssignmentAnswerDto**: `selectedOptionIds` (array), `textAnswer` (string), `timeSpentSeconds*` (number)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/assignments.server.ts:183`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L183)

#### `GET` /assignments/{id}/attempts

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_getAssignmentAttempts`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Lists all student attempts for an assignment including scores, time spent, and completion statuses.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/assignments.server.ts:215`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L215)

#### `GET` /assignments/attempts/{attemptId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_getAssignmentAttemptDetail`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Retrieves comprehensive attempt detail for admin grading and review, including student answers, correctness, and question text.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:365`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L365)

#### `PATCH` /assignments/attempts/{attemptId}/grade

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_gradeAttempt`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(assignments:grade)`)
- **Summary & Purpose**: Manual grading endpoint. Allows instructors/sub-admins to manually assign points and mark text/subjective answers as correct or incorrect.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: **GradeAttemptDto**: `grades*` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:319`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L319)

#### `GET` /assignments/student/attempts/{attemptId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_getStudentAttemptDetail`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Allows student to review their completed attempt with answers, explanations, earned score, and topic breakdown.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/assignments.server.ts:215`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/assignments.server.ts#L215)

#### `POST` /assignments/{id}/import

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AssignmentsController_importQuestions`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Bulk imports questions from uploaded file (CSV, JSON, or Excel XLSX) into the assignment question bank.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: `file*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/assignments.server.ts:298`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/assignments.server.ts#L298)


### 3.3 Domain: Users (3 Endpoints)

#### `GET` /users

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `UsersController_findAll`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Lists platform users with pagination and search. Supports filtering by role (student, admin, sub_admin) and account status.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/students.server.ts:144`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/students.server.ts#L144)
  - [`apps/web/server/admin/users.server.ts:27`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/users.server.ts#L27)
  - [`apps/web/server/user.server.ts:16`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/user.server.ts#L16)
  - [`apps/web/server/user.server.ts:32`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/user.server.ts#L32)

#### `PATCH` /users/{id}/toggle-active

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `UsersController_toggleActive`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Toggles a user account between active and suspended. Prevents banned users from signing in or accessing course materials.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/students.server.ts:175`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/students.server.ts#L175)

#### `GET` /users/{identifier}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `UsersController_findOne`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Retrieves complete profile details for a user identified by UUID or email address.
- **Parameters**:
  - `identifier*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/students.server.ts:144`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/students.server.ts#L144)
  - [`apps/web/server/user.server.ts:32`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/user.server.ts#L32)


### 3.4 Domain: Auth (16 Endpoints)

#### `POST` /auth/sign-up

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_register`
- **Access Control**: Public (Guard: `Public, Throttled`)
- **Summary & Purpose**: Registers a new user account in Supabase Auth and creates profile with default student role. Sends confirmation OTP email.
- **Parameters**: None
- **Request Body**: **CreateUserDto**: `email*` (string), `full_name*` (string), `date_of_birth*` (string), `password*` (string), `phone*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:216`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L216)

#### `POST` /auth/sign-in

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_signIn`
- **Access Control**: Public (Guard: `Public, Throttled`)
- **Summary & Purpose**: Authenticates student or admin credentials. Enforces maximum 2-device limit per student account. Returns JWT access token, refresh token, and user session.
- **Parameters**: None
- **Request Body**: **SignInUserDto**: `ip*` (string), `location*` (string), `device_name*` (string), `device_os*` (string), `device_type*` (string), `browser*` (string), `userAgent*` (string), `identifier*` (string), `password*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/app/auth/callback/route.ts:15`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/auth/callback/route.ts#L15)
  - [`apps/web/app/auth/callback/route.ts:18`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/auth/callback/route.ts#L18)
  - [`apps/web/server/auth.server.ts:43`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L43)

#### `POST` /auth/google-sign-in

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_googleSignIn`
- **Access Control**: Public (Guard: `Public, Throttled`)
- **Summary & Purpose**: Authenticates user via Google OAuth ID token, checks/creates profile, enforces device limits, and issues session tokens.
- **Parameters**: None
- **Request Body**: GoogleSignInDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:85`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L85)

#### `POST` /auth/supabase-sync

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_supabaseSync`
- **Access Control**: Public (Guard: `Public, Throttled`)
- **Summary & Purpose**: Synchronizes user record created via frontend Supabase OAuth with backend devices and profile records.
- **Parameters**: None
- **Request Body**: **SupabaseSyncDto**: `email*` (string), `name` (string), `avatar_url` (string), `provider*` (string), `provider_id*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/app/auth/callback/route.ts:21`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/auth/callback/route.ts#L21)

#### `PATCH` /auth/complete-profile

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_completeProfile`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Updates missing profile fields (full name, phone, date of birth) for newly registered or social login users.
- **Parameters**: None
- **Request Body**: **CompleteProfileDto**: `full_name*` (string), `date_of_birth*` (string), `phone*` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:255`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L255)

#### `POST` /auth/sign-out

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_signOut`
- **Access Control**: Public / Authenticated (Guard: `Public`)
- **Summary & Purpose**: Removes the active session from devices table and invalidates user session token.
- **Parameters**: None
- **Request Body**: **SignOutUserDto**: `session_token*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:197`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L197)
  - [`apps/web/server/auth.server.ts:287`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L287)

#### `DELETE` /auth/sessions

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_signOutAll`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Terminates all active device sessions for the authenticated user (force sign-out everywhere).
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:331`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L331)

#### `GET` /auth/sessions/{userId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_sessions`
- **Access Control**: Authenticated (Guard: `JWT (Self or Admin)`)
- **Summary & Purpose**: Lists all active registered device sessions (IP, device fingerprint, platform, last active) for a user.
- **Parameters**:
  - `userId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:455`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L455)

#### `GET` /auth/session/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_session`
- **Access Control**: Authenticated (Guard: `JWT (Self or Admin)`)
- **Summary & Purpose**: Retrieves metadata for a specific device session record.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:434`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L434)

#### `POST` /auth/resend-otp

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_resendOtp`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Resends email confirmation OTP or recovery OTP to the specified email address.
- **Parameters**: None
- **Request Body**: **ResendOtpDto**: `email*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:500`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L500)

#### `PATCH` /auth/confirm-email

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_confirmEmail`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Verifies 6-digit email confirmation OTP and marks user account active.
- **Parameters**: None
- **Request Body**: **ConfirmEmailDto**: `token*` (string), `email*` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:480`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L480)

#### `PATCH` /auth/forgot-password

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_forgotPassword`
- **Access Control**: Public (Guard: `Public, Throttled`)
- **Summary & Purpose**: Generates password recovery OTP and dispatches email to the user.
- **Parameters**: None
- **Request Body**: **ForgotPasswordDto**: `identifier*` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:385`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L385)

#### `PATCH` /auth/reset-password

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_resetPassword`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Verifies recovery OTP and updates the user account password.
- **Parameters**: None
- **Request Body**: **ResetPasswordDto**: `identifier*` (string), `resetToken*` (string), `newPassword*` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:411`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L411)

#### `PATCH` /auth/change-password

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_changePassword`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Allows logged-in user to change their password by verifying their old password first.
- **Parameters**: None
- **Request Body**: **ChangePasswordDto**: `identifier` (string), `password*` (string), `newPassword*` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:357`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L357)

#### `PATCH` /auth/refresh-token

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_refreshToken`
- **Access Control**: Authenticated (Refresh) (Guard: `JwtRefreshGuard`)
- **Summary & Purpose**: Issues a new JWT access token using a valid, non-expired refresh token.
- **Parameters**: None
- **Request Body**: **RefreshTokenDto**: `user_id*` (string), `session_token*` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:538`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L538)

#### `DELETE` /auth/delete-account

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `AuthController_deleteUser`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Permanently deletes user account, profile, active enrollments, and device sessions.
- **Parameters**: None
- **Request Body**: **DeleteUserDto**: `user_id*` (string), `password*` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/auth.server.ts:619`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/auth.server.ts#L619)


### 3.5 Domain: Health (5 Endpoints)

#### `GET` /health/database

- **Status**: ⚙️ Infrastructure / Health Probe
- **Operation ID**: `HealthController_checkDatabase`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Verifies live PostgreSQL database connectivity and responsiveness via TypeORM/Prisma/pg ping.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200, 503`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /health

- **Status**: ⚙️ Infrastructure / Health Probe
- **Operation ID**: `HealthController_check`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: System liveness and readiness probe for container orchestrators and reverse proxies.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200, 503`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /health/disk

- **Status**: ⚙️ Infrastructure / Health Probe
- **Operation ID**: `HealthController_checkDisk`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Checks server storage disk availability and ensures storage thresholds are not exceeded.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200, 503`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /health/memory

- **Status**: ⚙️ Infrastructure / Health Probe
- **Operation ID**: `HealthController_checkMemory`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Monitors Node.js heap and RSS memory consumption against defined maximum memory thresholds.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200, 503`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /health/supabase

- **Status**: ⚙️ Infrastructure / Health Probe
- **Operation ID**: `HealthController_checkSupabase`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Pings Supabase REST endpoint to verify authentication service and SDK connectivity.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**: *None found in frontend codebase*


### 3.6 Domain: Categories (7 Endpoints)

#### `POST` /categories

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CategoriesController_create`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Creates a new course category with name, kebab-case slug, description, and sort order.
- **Parameters**: None
- **Request Body**: **CreateCategoryDto**: `name*` (string), `slug*` (string), `description` (string), `thumbnail_url` (string), `sort_order` (number), `is_active` (boolean)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/categories.server.ts:70`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L70)
  - [`apps/web/server/admin/categories.server.ts:146`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L146)

#### `GET` /categories

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CategoriesController_findAll`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Lists course categories. Returns active categories for students, or all categories if includeInactive=true.
- **Parameters**:
  - `includeInactive*` (query, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/components/admin/categories-client.tsx:260`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/categories-client.tsx#L260)
  - [`apps/web/components/admin/sidebar.tsx:62`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/sidebar.tsx#L62)
  - [`apps/web/server/admin/categories.server.ts:47`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L47)
  - [`apps/web/server/admin/categories.server.ts:138`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L138)
  - [`apps/web/server/admin/categories.server.ts:158`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L158)
  - [`apps/web/server/student/courses.server.ts:39`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L39)

#### `GET` /categories/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CategoriesController_findOne`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Fetches category record by UUID.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/components/admin/categories-client.tsx:260`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/categories-client.tsx#L260)

#### `PATCH` /categories/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CategoriesController_update`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Updates category title, slug, description, sort order, and active status.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **UpdateCategoryDto**: `name` (string), `slug` (string), `description` (string), `thumbnail_url` (string), `sort_order` (number), `is_active` (boolean)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/categories.server.ts:89`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L89)
  - [`apps/web/server/admin/categories.server.ts:125`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L125)

#### `DELETE` /categories/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CategoriesController_remove`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Deletes a course category. Prevents deletion if active courses are linked to it.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/categories.server.ts:108`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L108)

#### `PATCH` /categories/reorder

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CategoriesController_reorder`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Batch updates category sort orders for drag-and-drop management in Admin.
- **Parameters**: None
- **Request Body**: **ReorderCategoriesDto**: `categories*` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/categories.server.ts:125`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L125)

#### `POST` /categories/{id}/thumbnail

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CategoriesController_uploadThumbnail`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Uploads category thumbnail image to course-media Supabase storage bucket and updates category record.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: `file*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/categories.server.ts:146`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/categories.server.ts#L146)


### 3.7 Domain: Courses (8 Endpoints)

#### `POST` /courses

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_create`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Creates a new course draft with title, slug, price, discount price, and category association.
- **Parameters**: None
- **Request Body**: **CreateCourseDto**: `title*` (string), `slug*` (string), `description` (string), `category_id` (string), `thumbnail_url` (string), `price*` (number), `discount_price` (number), `status` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/courses.server.ts:69`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L69)
  - [`apps/web/server/admin/courses.server.ts:138`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L138)

#### `GET` /courses

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_findPublished`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Catalog endpoint: lists all published courses with category and pricing info for students and visitors.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/app/(home)/page.tsx:31`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/(home)/page.tsx#L31)
  - [`apps/web/app/courses/[slug]/page.tsx:3`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/courses/[slug]/page.tsx#L3)
  - [`apps/web/app/courses/layout.tsx:27`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/courses/layout.tsx#L27)
  - [`apps/web/app/courses/page.tsx:2`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/courses/page.tsx#L2)
  - [`apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx:51`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx#L51)
  - [`apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx:73`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx#L73)
  - [`apps/web/components/admin/course-analytics-client.tsx:933`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-analytics-client.tsx#L933)
  - [`apps/web/components/admin/course-analytics-client.tsx:967`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-analytics-client.tsx#L967)
  - [`apps/web/components/admin/course-analytics-client.tsx:977`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-analytics-client.tsx#L977)
  - [`apps/web/components/admin/course-detail-client.tsx:1313`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx#L1313)
  - [`apps/web/components/admin/course-detail-client.tsx:1329`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx#L1329)
  - [`apps/web/components/admin/course-detail-client.tsx:1765`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx#L1765)
  - [`apps/web/components/admin/courses-client.tsx:268`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/courses-client.tsx#L268)
  - [`apps/web/components/admin/courses-client.tsx:392`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/courses-client.tsx#L392)
  - [`apps/web/components/admin/courses-client.tsx:442`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/courses-client.tsx#L442)
  - [`apps/web/components/admin/enrollments-client.tsx:527`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/enrollments-client.tsx#L527)
  - [`apps/web/components/admin/sidebar.tsx:61`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/sidebar.tsx#L61)
  - [`apps/web/components/courses/browse-client.tsx:179`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/browse-client.tsx#L179)
  - [`apps/web/components/courses/course-view-client.tsx:79`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/course-view-client.tsx#L79)
  - [`apps/web/components/courses/course-view-client.tsx:121`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/course-view-client.tsx#L121)
  - [`apps/web/components/courses/course-view-client.tsx:135`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/course-view-client.tsx#L135)
  - [`apps/web/components/courses/course-view-client.tsx:245`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/course-view-client.tsx#L245)
  - [`apps/web/components/dashboard/attempts-history-client.tsx:95`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/attempts-history-client.tsx#L95)
  - [`apps/web/components/dashboard/course-progress-client.tsx:68`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-progress-client.tsx#L68)
  - [`apps/web/components/dashboard/course-progress-client.tsx:170`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-progress-client.tsx#L170)
  - [`apps/web/components/dashboard/course-toc.tsx:152`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-toc.tsx#L152)
  - [`apps/web/components/dashboard/course-toc.tsx:269`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-toc.tsx#L269)
  - [`apps/web/components/dashboard/dashboard-client.tsx:33`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L33)
  - [`apps/web/components/dashboard/dashboard-client.tsx:88`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L88)
  - [`apps/web/components/dashboard/dashboard-client.tsx:215`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L215)
  - [`apps/web/components/dashboard/dashboard-client.tsx:239`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L239)
  - [`apps/web/components/dashboard/dashboard-client.tsx:274`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L274)
  - [`apps/web/components/dashboard/lesson-progress-actions.tsx:98`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/lesson-progress-actions.tsx#L98)
  - [`apps/web/components/dashboard/lesson-progress-actions.tsx:141`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/lesson-progress-actions.tsx#L141)
  - [`apps/web/components/dashboard/my-cources-client.tsx:70`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/my-cources-client.tsx#L70)
  - [`apps/web/components/dashboard/my-cources-client.tsx:106`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/my-cources-client.tsx#L106)
  - [`apps/web/components/dashboard/my-cources-client.tsx:114`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/my-cources-client.tsx#L114)
  - [`apps/web/components/dashboard/sidebar.tsx:58`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/sidebar.tsx#L58)
  - [`apps/web/components/dashboard/sidebar.tsx:59`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/sidebar.tsx#L59)
  - [`apps/web/components/dashboard/test-viewer.tsx:953`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/test-viewer.tsx#L953)
  - [`apps/web/lib/auth/is-authorized.ts:31`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/lib/auth/is-authorized.ts#L31)
  - [`apps/web/server/admin/analytics.server.ts:105`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L105)
  - [`apps/web/server/admin/analytics.server.ts:116`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L116)
  - [`apps/web/server/admin/chapters.server.ts:46`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L46)
  - [`apps/web/server/admin/course-detail.server.ts:36`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/course-detail.server.ts#L36)
  - [`apps/web/server/admin/course-detail.server.ts:73`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/course-detail.server.ts#L73)
  - [`apps/web/server/admin/course-detail.server.ts:74`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/course-detail.server.ts#L74)
  - [`apps/web/server/admin/courses.server.ts:46`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L46)
  - [`apps/web/server/admin/courses.server.ts:82`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L82)
  - [`apps/web/server/admin/courses.server.ts:112`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L112)
  - [`apps/web/server/admin/courses.server.ts:130`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L130)
  - [`apps/web/server/admin/courses.server.ts:150`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L150)
  - [`apps/web/server/admin/courses.server.ts:151`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L151)
  - [`apps/web/server/student/courses.server.ts:49`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L49)
  - [`apps/web/server/student/courses.server.ts:57`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L57)

#### `GET` /courses/admin

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_findAll`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:read)`)
- **Summary & Purpose**: Admin course roster: returns all courses including draft, published, and archived states.
- **Parameters**:
  - `status*` (query, string)
  - `category_id*` (query, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/courses.server.ts:46`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L46)

#### `GET` /courses/slug/{slug}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_findBySlug`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Course landing page data: returns published course details, curriculum outline, pricing, and category metadata.
- **Parameters**:
  - `slug*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/courses.server.ts:57`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L57)

#### `GET` /courses/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_findOne`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Fetches single course details by UUID.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/app/courses/[slug]/page.tsx:3`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/courses/[slug]/page.tsx#L3)
  - [`apps/web/app/courses/page.tsx:2`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/courses/page.tsx#L2)
  - [`apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx:51`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx#L51)
  - [`apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx:73`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx#L73)
  - [`apps/web/components/admin/course-analytics-client.tsx:977`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-analytics-client.tsx#L977)
  - [`apps/web/components/admin/course-detail-client.tsx:1329`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx#L1329)
  - [`apps/web/components/admin/course-detail-client.tsx:1765`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx#L1765)
  - [`apps/web/components/admin/courses-client.tsx:268`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/courses-client.tsx#L268)
  - [`apps/web/components/admin/courses-client.tsx:392`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/courses-client.tsx#L392)
  - [`apps/web/components/admin/courses-client.tsx:442`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/courses-client.tsx#L442)
  - [`apps/web/components/admin/enrollments-client.tsx:527`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/enrollments-client.tsx#L527)
  - [`apps/web/components/courses/browse-client.tsx:179`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/browse-client.tsx#L179)
  - [`apps/web/components/courses/course-view-client.tsx:79`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/course-view-client.tsx#L79)
  - [`apps/web/components/courses/course-view-client.tsx:121`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/course-view-client.tsx#L121)
  - [`apps/web/components/courses/course-view-client.tsx:245`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/courses/course-view-client.tsx#L245)
  - [`apps/web/components/dashboard/attempts-history-client.tsx:95`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/attempts-history-client.tsx#L95)
  - [`apps/web/components/dashboard/course-progress-client.tsx:68`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-progress-client.tsx#L68)
  - [`apps/web/components/dashboard/course-progress-client.tsx:170`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-progress-client.tsx#L170)
  - [`apps/web/components/dashboard/course-toc.tsx:152`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-toc.tsx#L152)
  - [`apps/web/components/dashboard/course-toc.tsx:269`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-toc.tsx#L269)
  - [`apps/web/components/dashboard/dashboard-client.tsx:33`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L33)
  - [`apps/web/components/dashboard/dashboard-client.tsx:88`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L88)
  - [`apps/web/components/dashboard/dashboard-client.tsx:215`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/dashboard-client.tsx#L215)
  - [`apps/web/components/dashboard/lesson-progress-actions.tsx:98`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/lesson-progress-actions.tsx#L98)
  - [`apps/web/components/dashboard/lesson-progress-actions.tsx:141`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/lesson-progress-actions.tsx#L141)
  - [`apps/web/components/dashboard/my-cources-client.tsx:114`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/my-cources-client.tsx#L114)
  - [`apps/web/components/dashboard/test-viewer.tsx:953`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/test-viewer.tsx#L953)
  - [`apps/web/server/admin/analytics.server.ts:105`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L105)
  - [`apps/web/server/admin/analytics.server.ts:116`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/analytics.server.ts#L116)
  - [`apps/web/server/admin/course-detail.server.ts:36`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/course-detail.server.ts#L36)
  - [`apps/web/server/admin/course-detail.server.ts:74`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/course-detail.server.ts#L74)
  - [`apps/web/server/admin/courses.server.ts:46`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L46)
  - [`apps/web/server/admin/courses.server.ts:151`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L151)
  - [`apps/web/server/student/courses.server.ts:57`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L57)

#### `PATCH` /courses/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_update`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Updates course details, pricing, discount, and status transitions (draft <-> published <-> archived).
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **UpdateCourseDto**: `title` (string), `slug` (string), `description` (string), `category_id` (string), `thumbnail_url` (string), `price` (number), `discount_price` (number), `status` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/course-detail.server.ts:61`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/course-detail.server.ts#L61)
  - [`apps/web/server/admin/courses.server.ts:99`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L99)

#### `DELETE` /courses/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_remove`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Deletes a course and cascades deletion to chapters, lessons, video assets, and PDF materials.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/courses.server.ts:113`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L113)
  - [`apps/web/server/admin/courses.server.ts:119`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L119)

#### `POST` /courses/{id}/thumbnail

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `CoursesController_uploadThumbnail`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Uploads course thumbnail image to course-media bucket and persists public URL on course record.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: `file*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/courses.server.ts:138`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/courses.server.ts#L138)


### 3.8 Domain: Lessons (9 Endpoints)

#### `POST` /lessons

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_create`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Creates a lesson inside a chapter (type: video, pdf, assignment, or test).
- **Parameters**: None
- **Request Body**: **CreateLessonDto**: `chapter_id*` (string), `title*` (string), `description` (string), `lesson_type*` (string), `sort_order` (number), `is_published` (boolean)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:181`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L181)
  - [`apps/web/server/admin/chapters.server.ts:201`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L201)

#### `POST` /lessons/{id}/pdf

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_uploadPdf`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Uploads PDF lesson file to private course-materials storage bucket and records file size and page count.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:201`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L201)

#### `DELETE` /lessons/{id}/pdf

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_deletePdf`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Deletes PDF note from private storage bucket and removes pdf_notes record.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:216`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L216)

#### `GET` /lessons/{id}/pdf-url

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_getPdf`
- **Access Control**: Student / Enrolled (Guard: `JWT (Enrollment Guard)`)
- **Summary & Purpose**: Generates a secure time-limited signed URL (60 mins) for streaming/viewing the lesson PDF.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/app/api/lessons/[lessonId]/pdf-url/route.ts:20`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/api/lessons/[lessonId]/pdf-url/route.ts#L20)
  - [`apps/web/components/dashboard/pdf-viewer.tsx:30`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/pdf-viewer.tsx#L30)

#### `GET` /lessons/chapter/{chapterId}

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `LessonsController_findByChapter`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Lists all lessons for a specific chapter.
- **Parameters**:
  - `chapterId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /lessons/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_findOne`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Fetches lesson metadata, type, duration, and publication status.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/app/api/lessons/[lessonId]/pdf-url/route.ts:20`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/api/lessons/[lessonId]/pdf-url/route.ts#L20)
  - [`apps/web/components/dashboard/attempts-history-client.tsx:95`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/attempts-history-client.tsx#L95)
  - [`apps/web/components/dashboard/course-progress-client.tsx:170`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-progress-client.tsx#L170)
  - [`apps/web/components/dashboard/course-toc.tsx:269`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/course-toc.tsx#L269)
  - [`apps/web/components/dashboard/lesson-progress-actions.tsx:98`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/lesson-progress-actions.tsx#L98)
  - [`apps/web/components/dashboard/lesson-progress-actions.tsx:141`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/lesson-progress-actions.tsx#L141)
  - [`apps/web/components/dashboard/pdf-viewer.tsx:30`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/pdf-viewer.tsx#L30)

#### `PATCH` /lessons/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_update`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Updates lesson title, description, lesson type, sort order, and publication status.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **UpdateLessonDto**: `title` (string), `description` (string), `lesson_type` (string), `sort_order` (number), `is_published` (boolean)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:241`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L241)
  - [`apps/web/server/admin/chapters.server.ts:260`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L260)

#### `DELETE` /lessons/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_remove`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Deletes lesson, removes associated VdoCipher video or Supabase PDF, and adjusts chapter sequencing.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:216`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L216)
  - [`apps/web/server/admin/chapters.server.ts:279`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L279)

#### `PATCH` /lessons/reorder

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `LessonsController_reorder`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Batch reorders lessons within a chapter for drag-and-drop curriculum organizing.
- **Parameters**: None
- **Request Body**: **ReorderLessonsDto**: `lessons*` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:260`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L260)


### 3.9 Domain: Videos (7 Endpoints)

#### `POST` /videos/lesson

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `VideosController_createVideoLesson`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Associates a pre-existing VdoCipher video ID with a lesson record.
- **Parameters**: None
- **Request Body**: **CreateVideoLessonDto**: `lesson_id*` (string), `vdocipher_video_id*` (string), `thumbnail_url` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/videos.server.ts:48`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/videos.server.ts#L48)
  - [`apps/web/server/admin/videos.server.ts:66`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/videos.server.ts#L66)

#### `POST` /videos/lesson/{lessonId}/upload

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `VideosController_uploadVideo`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Requests VdoCipher direct upload credentials and creates course/chapter folder structure.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/videos.server.ts:66`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/videos.server.ts#L66)

#### `GET` /videos/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `VideosController_findByLesson`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:read)`)
- **Summary & Purpose**: Fetches video lesson metadata, duration, VdoCipher video ID, and poster thumbnail.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/components/admin/course-detail-client.tsx:304`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx#L304)
  - [`apps/web/components/admin/course-detail-client.tsx:450`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/course-detail-client.tsx#L450)
  - [`apps/web/server/admin/videos.server.ts:35`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/videos.server.ts#L35)

#### `PATCH` /videos/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `VideosController_updateVideoLesson`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Updates video lesson configuration and thumbnail URL.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: **UpdateVideoLessonDto**: `vdocipher_video_id` (string), `thumbnail_url` (string)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/videos.server.ts:86`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/videos.server.ts#L86)

#### `DELETE` /videos/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `VideosController_deleteVideoLesson`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Deletes video asset from VdoCipher server and removes the video_lessons row.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/videos.server.ts:99`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/videos.server.ts#L99)

#### `GET` /videos/course/{courseId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `VideosController_findByCourse`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:read)`)
- **Summary & Purpose**: Lists all video lessons contained across all chapters of a course.
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/videos.server.ts:111`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/videos.server.ts#L111)

#### `POST` /videos/{lessonId}/otp

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `VideosController_generateOtp`
- **Access Control**: Student / Enrolled (Guard: `JWT (Enrollment Guard)`)
- **Summary & Purpose**: Generates dynamic DRM playback OTP and encrypted playbackInfo with student email watermark. Enforces concurrent device guard.
- **Parameters**:
  - `lessonId*` (path, string)
  - `user-agent*` (header, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/app/api/video-otp/[lessonId]/route.ts:16`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/api/video-otp/[lessonId]/route.ts#L16)
  - [`apps/web/server/student/videos.server.ts:22`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/videos.server.ts#L22)


### 3.10 Domain: Chapters (8 Endpoints)

#### `POST` /chapters

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_create`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Creates a new chapter in a course with title, description, and sort order.
- **Parameters**: None
- **Request Body**: **CreateChapterDto**: `course_id*` (string), `title*` (string), `description` (string), `sort_order` (number), `is_published` (boolean)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:95`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L95)
  - [`apps/web/server/student/chapters.server.ts:46`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/chapters.server.ts#L46)

#### `GET` /chapters/course/{courseId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_findByCourse`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Fetches course curriculum tree: all chapters ordered by sort_order with nested lessons.
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:65`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L65)

#### `GET` /chapters/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_findOne`
- **Access Control**: Public (Guard: `Public`)
- **Summary & Purpose**: Fetches single chapter metadata.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:65`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L65)
  - [`apps/web/server/student/chapters.server.ts:76`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/chapters.server.ts#L76)

#### `PATCH` /chapters/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_update`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Updates chapter title, description, sort order, and publication status.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **UpdateChapterDto**: `title` (string), `description` (string), `sort_order` (number), `is_published` (boolean)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:121`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L121)
  - [`apps/web/server/admin/chapters.server.ts:140`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L140)

#### `DELETE` /chapters/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_remove`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Deletes chapter and cascades deletion to all child lessons and resources.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:159`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L159)

#### `POST` /chapters/{id}/start

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_startChapter`
- **Access Control**: Student / Enrolled (Guard: `JWT`)
- **Summary & Purpose**: Records student chapter start in chapter_starts table. Enforces sequential completion of previous chapter and triggers assignment deadlines.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/chapters.server.ts:46`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/chapters.server.ts#L46)

#### `GET` /chapters/{id}/start

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_getChapterStart`
- **Access Control**: Student / Enrolled (Guard: `JWT`)
- **Summary & Purpose**: Checks if current student has started this chapter and retrieves started_at timestamp.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/chapters.server.ts:76`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/chapters.server.ts#L76)

#### `PATCH` /chapters/reorder

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ChaptersController_reorder`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(courses:write)`)
- **Summary & Purpose**: Batch reorders chapters in a course.
- **Parameters**: None
- **Request Body**: **ReorderChaptersDto**: `chapters*` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/chapters.server.ts:140`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/chapters.server.ts#L140)


### 3.11 Domain: Enrollments (8 Endpoints)

#### `POST` /enrollments

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_create`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(students:read)`)
- **Summary & Purpose**: Manually creates an enrollment for a student in a course (complimentary / offline admission).
- **Parameters**: None
- **Request Body**: CreateEnrollmentDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/enrollments.server.ts:218`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L218)
  - [`apps/web/server/student/courses.server.ts:200`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L200)

#### `GET` /enrollments

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_findAll`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(students:read)`)
- **Summary & Purpose**: Lists all enrollments across platform with student details, course title, status, and enrollment date.
- **Parameters**:
  - `studentId` (query, string): Filter by student id
  - `courseId` (query, string): Filter by course id
  - `status` (query, string)
  - `search` (query, string): Matches student full_name or email
  - `page` (query, number)
  - `limit` (query, number)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/components/admin/sidebar.tsx:70`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/sidebar.tsx#L70)
  - [`apps/web/server/admin/enrollments.server.ts:102`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L102)
  - [`apps/web/server/admin/enrollments.server.ts:120`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L120)
  - [`apps/web/server/admin/enrollments.server.ts:230`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L230)
  - [`apps/web/server/admin/students.server.ts:155`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/students.server.ts#L155)
  - [`apps/web/server/student/courses.server.ts:82`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L82)
  - [`apps/web/server/student/courses.server.ts:94`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L94)

#### `GET` /enrollments/my

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_getMyEnrollments`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Returns logged-in student active course enrollments with overall completion percentage.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/courses.server.ts:82`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L82)

#### `GET` /enrollments/course/{courseId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_findByCourse`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(students:read)`)
- **Summary & Purpose**: Lists all enrollments specifically for a given course.
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/enrollments.server.ts:120`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L120)

#### `GET` /enrollments/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_findOne`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(students:read)`)
- **Summary & Purpose**: Fetches detailed enrollment record by ID.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/enrollments.server.ts:120`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L120)
  - [`apps/web/server/student/courses.server.ts:82`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L82)
  - [`apps/web/server/student/courses.server.ts:94`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L94)

#### `PATCH` /enrollments/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_update`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(students:read)`)
- **Summary & Purpose**: Updates enrollment status (e.g. revoke access to expired, or restore to active).
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: UpdateEnrollmentDto
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/students.server.ts:223`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/students.server.ts#L223)

#### `GET` /enrollments/check/{courseId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_checkEnrollment`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Checks if current student has active enrollment for a given course.
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/courses.server.ts:94`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L94)

#### `POST` /enrollments/free/{courseId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `EnrollmentsController_enrollFree`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Instant 1-click self-enrollment for free / promotional courses (price = 0).
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/courses.server.ts:200`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L200)


### 3.12 Domain: Payments (6 Endpoints)

#### `POST` /payments/order

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PaymentsController_createOrder`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Initializes course purchase by generating a Razorpay Order ID with computed discount pricing.
- **Parameters**: None
- **Request Body**: CreateOrderDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/courses.server.ts:230`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L230)

#### `POST` /payments/verify

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PaymentsController_verifyPayment`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Validates Razorpay payment signature (HMAC SHA256) server-side, records payment, and enrolls student.
- **Parameters**: None
- **Request Body**: VerifyPaymentDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/courses.server.ts:255`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L255)

#### `POST` /payments/webhook

- **Status**: 🔗 External Webhook (Razorpay)
- **Operation ID**: `PaymentsController_handleWebhook`
- **Access Control**: Public (Razorpay Signature) (Guard: `Public (Webhook Secret Verification)`)
- **Summary & Purpose**: Webhook receiver for asynchronous payment events (payment.captured, refund.processed) directly from Razorpay.
- **Parameters**:
  - `x-razorpay-signature*` (header, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /payments/my

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `PaymentsController_getMyPayments`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Retrieves all historical payment receipts and invoice records for current student.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /payments

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PaymentsController_findAll`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(payments:read)`)
- **Summary & Purpose**: Lists all platform financial transactions, filterable by date, status, and course, with invoice export.
- **Parameters**:
  - `status*` (query, string)
  - `course_id*` (query, string)
  - `student_id*` (query, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/components/admin/sidebar.tsx:76`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/admin/sidebar.tsx#L76)
  - [`apps/web/server/admin/payments.server.ts:45`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/payments.server.ts#L45)

#### `POST` /payments/{id}/refund

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `PaymentsController_refund`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(payments:refund)`)
- **Summary & Purpose**: Executes refund through Razorpay Payments API and transitions course enrollment to revoked.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: RefundPaymentDto
- **Responses**: `201`
- **Callers in Web App**: *None found in frontend codebase*


### 3.13 Domain: Progress (6 Endpoints)

#### `POST` /progress

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `ProgressController_initProgress`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Initializes a progress record for a lesson if one does not already exist.
- **Parameters**: None
- **Request Body**: CreateProgressDto
- **Responses**: `201`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /progress/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ProgressController_getLessonProgress`
- **Access Control**: Student / Enrolled (Guard: `JWT`)
- **Summary & Purpose**: Retrieves current student progress for a lesson, including last position (seconds) and status.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/app/api/progress/[lessonId]/route.ts:12`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/api/progress/[lessonId]/route.ts#L12)

#### `PATCH` /progress/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ProgressController_updateProgress`
- **Access Control**: Student / Enrolled (Guard: `JWT`)
- **Summary & Purpose**: Updates video watch time / position, calculates progress percentage, and marks lesson completed when threshold met.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: UpdateProgressDto
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/app/api/progress/[lessonId]/route.ts:28`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/app/api/progress/[lessonId]/route.ts#L28)
  - [`apps/web/components/dashboard/lesson-progress-actions.tsx:69`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/lesson-progress-actions.tsx#L69)
  - [`apps/web/components/dashboard/test-viewer.tsx:1087`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/dashboard/test-viewer.tsx#L1087)
  - [`apps/web/components/video-player.tsx:174`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/components/video-player.tsx#L174)

#### `GET` /progress/course/{courseId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ProgressController_getCourseProgress`
- **Access Control**: Student / Enrolled (Guard: `JWT`)
- **Summary & Purpose**: Calculates overall completion percentage for a course and returns list of completed lesson IDs.
- **Parameters**:
  - `courseId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/enrollments.server.ts:176`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L176)
  - [`apps/web/server/student/courses.server.ts:276`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/courses.server.ts#L276)

#### `GET` /progress/course/{courseId}/student/{studentId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ProgressController_getStudentCourseProgress`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Admin inspection of a specific student course progress and lesson completions.
- **Parameters**:
  - `courseId*` (path, string)
  - `studentId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/enrollments.server.ts:176`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/enrollments.server.ts#L176)

#### `GET` /progress/student/{studentId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `ProgressController_getStudentProgress`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Summarizes overall learning progress across all enrolled courses for a specific student.
- **Parameters**:
  - `studentId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/students.server.ts:166`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/students.server.ts#L166)


### 3.14 Domain: Permissions (7 Endpoints)

#### `GET` /permissions/available

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PermissionsController_getAvailablePermissions`
- **Access Control**: Admin (Guard: `Roles(ADMIN)`)
- **Summary & Purpose**: Lists all available permission slugs (courses:*, students:*, payments:*, doubt_sessions:*, reports:*, referrals:*).
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/permissions.server.ts:41`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L41)

#### `GET` /permissions/sub-admins

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PermissionsController_getAllSubAdmins`
- **Access Control**: Admin (Guard: `Roles(ADMIN)`)
- **Summary & Purpose**: Lists all sub-admin accounts with their currently granted permission matrix.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/permissions.server.ts:32`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L32)

#### `GET` /permissions/{userId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PermissionsController_getPermissions`
- **Access Control**: Admin (Guard: `Roles(ADMIN)`)
- **Summary & Purpose**: Fetches granted permission slugs for a specific sub-admin user.
- **Parameters**:
  - `userId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/permissions.server.ts:32`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L32)
  - [`apps/web/server/admin/permissions.server.ts:41`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L41)

#### `DELETE` /permissions/{userId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PermissionsController_revoke`
- **Access Control**: Admin (Guard: `Roles(ADMIN)`)
- **Summary & Purpose**: Clears all granted permissions for a user.
- **Parameters**:
  - `userId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/permissions.server.ts:80`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L80)

#### `POST` /permissions

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PermissionsController_setPermissions`
- **Access Control**: Admin (Guard: `Roles(ADMIN)`)
- **Summary & Purpose**: Saves or updates permission slugs array for a sub-admin in sub_admin_permissions table.
- **Parameters**: None
- **Request Body**: SetPermissionsDto
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/permissions.server.ts:50`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L50)
  - [`apps/web/server/admin/permissions.server.ts:60`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L60)
  - [`apps/web/server/admin/permissions.server.ts:70`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L70)

#### `POST` /permissions/{userId}/promote

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PermissionsController_promote`
- **Access Control**: Admin (Guard: `Roles(ADMIN)`)
- **Summary & Purpose**: Promotes a user from student role to sub_admin role.
- **Parameters**:
  - `userId*` (path, string)
- **Request Body**: PromoteUserDto
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/permissions.server.ts:60`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L60)

#### `POST` /permissions/{userId}/demote

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `PermissionsController_demote`
- **Access Control**: Admin (Guard: `Roles(ADMIN)`)
- **Summary & Purpose**: Demotes a sub-admin back to student role and revokes all sub-admin permissions.
- **Parameters**:
  - `userId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/permissions.server.ts:70`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/permissions.server.ts#L70)


### 3.15 Domain: Tests (18 Endpoints)

#### `POST` /tests

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_create`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Creates a test/mock exam linked to a lesson.
- **Parameters**: None
- **Request Body**: **CreateTestDto**: `lesson_id*` (string), `title*` (string), `time_limit_seconds` (number), `passing_score_percent` (number), `max_attempts` (number)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:140`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L140)
  - [`apps/web/server/admin/tests.server.ts:202`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L202)
  - [`apps/web/server/admin/tests.server.ts:279`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L279)
  - [`apps/web/server/student/tests.server.ts:170`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L170)
  - [`apps/web/server/student/tests.server.ts:188`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L188)

#### `GET` /tests/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_findByLesson`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Fetches test configuration, questions, options, and grading settings for admin editing.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:123`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L123)

#### `PATCH` /tests/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_update`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Updates test parameters (title, duration/time limit, passing score, maximum attempts).
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **UpdateTestDto**: `title` (string), `time_limit_seconds` (number), `passing_score_percent` (number), `max_attempts` (number)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:162`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L162)
  - [`apps/web/server/admin/tests.server.ts:231`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L231)
  - [`apps/web/server/admin/tests.server.ts:263`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L263)
  - [`apps/web/server/admin/tests.server.ts:300`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L300)
  - [`apps/web/server/student/tests.server.ts:213`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L213)

#### `DELETE` /tests/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_remove`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Deletes test and cascades deletion to test questions, options, attempts, and answer logs.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:176`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L176)
  - [`apps/web/server/admin/tests.server.ts:247`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L247)

#### `POST` /tests/{id}/questions

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_createQuestion`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Adds a question (MCQ, MSQ, or text) to the test question bank with points and explanations.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **CreateTestQuestionDto**: `question_text*` (string), `question_type*` (string), `points` (number), `explanation` (string), `sort_order` (number), `question_number` (number), `correct_text_answer` (string), `topic` (string), `options` (array)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:202`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L202)

#### `PATCH` /tests/questions/{questionId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_updateQuestion`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Updates question text, options, correct answers, topic, and explanation.
- **Parameters**:
  - `questionId*` (path, string)
- **Request Body**: **UpdateTestQuestionDto**: `question_text` (string), `question_type` (string), `points` (number), `explanation` (string), `sort_order` (number), `question_number` (number), `correct_text_answer` (string), `topic` (string), `options` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:231`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L231)

#### `DELETE` /tests/questions/{questionId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_removeQuestion`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Deletes a question from a test.
- **Parameters**:
  - `questionId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:247`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L247)

#### `PATCH` /tests/{id}/questions/reorder

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_reorderQuestions`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Batch updates question order numbers in a test.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: **ReorderTestQuestionsDto**: `questions*` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:263`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L263)

#### `GET` /tests/student/lesson/{lessonId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_getTestForStudentLesson`
- **Access Control**: Student / Enrolled (Guard: `JWT (Enrollment Guard)`)
- **Summary & Purpose**: Student test landing view: verifies course enrollment, returns past attempt scores, time limit, and remaining attempts.
- **Parameters**:
  - `lessonId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/tests.server.ts:158`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L158)

#### `GET` /tests/student/my-attempts

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_getMyAttempts`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Lists all test attempts completed by current student across all courses.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/tests.server.ts:294`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L294)

#### `POST` /tests/student/{testId}/attempts

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_startAttempt`
- **Access Control**: Student / Enrolled (Guard: `JWT`)
- **Summary & Purpose**: Starts a new test attempt. Checks attempt quota and active attempt locks, initializes test timer.
- **Parameters**:
  - `testId*` (path, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/tests.server.ts:170`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L170)

#### `POST` /tests/student/attempts/{attemptId}/submit

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_submitAttempt`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Submits completed test attempt. Auto-grades MCQ and MSQ questions, calculates score and percentage, checks pass threshold, and marks lesson completed.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: **SubmitTestAttemptDto**: `answers*` (array)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student/tests.server.ts:188`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L188)

#### `PATCH` /tests/student/attempts/{attemptId}/answers/{questionId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_saveAnswer`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Auto-saves intermediate answer for a question while the student is taking the test.
- **Parameters**:
  - `attemptId*` (path, string)
  - `questionId*` (path, string)
- **Request Body**: **SaveAnswerDto**: `selectedOptionIds` (array), `textAnswer` (string), `timeSpentSeconds*` (number)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/tests.server.ts:213`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L213)

#### `GET` /tests/{id}/attempts

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_getTestAttempts`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Lists all student attempts for a test with scores, duration, and completion timestamps.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/tests.server.ts:250`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L250)

#### `GET` /tests/attempts/{attemptId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_getAttemptDetail`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Detailed attempt review for admin: inspects student answers, correct answers, and points earned.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:346`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L346)

#### `PATCH` /tests/attempts/{attemptId}/grade

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_gradeAttempt`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(tests:grade)`)
- **Summary & Purpose**: Manual grading endpoint for subjective test questions.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: **GradeAttemptDto**: `grades*` (array)
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:300`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L300)

#### `GET` /tests/student/attempts/{attemptId}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_getStudentAttemptDetail`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Allows student to review their completed test attempt results, answer explanations, and topic-wise performance breakdown.
- **Parameters**:
  - `attemptId*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student/tests.server.ts:250`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student/tests.server.ts#L250)

#### `POST` /tests/{id}/import

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `TestsController_importQuestions`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Bulk imports questions from CSV/JSON/XLSX file into the test question bank.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: `file*` (string)
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/admin/tests.server.ts:279`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/admin/tests.server.ts#L279)


### 3.16 Domain: Doubt Sessions (10 Endpoints)

#### `POST` /doubt-sessions/slots

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_createSlot`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(doubt_sessions:manage)`)
- **Summary & Purpose**: Creates a doubt clearance slot with date, time, duration, maximum bookings, topic, and meeting link.
- **Parameters**: None
- **Request Body**: CreateSlotDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:67`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L67)

#### `GET` /doubt-sessions/slots

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_getSlots`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(doubt_sessions:manage)`)
- **Summary & Purpose**: Lists all scheduled doubt slots with optional date and status filters.
- **Parameters**:
  - `date*` (query, string)
  - `status*` (query, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:54`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L54)

#### `PATCH` /doubt-sessions/slots/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_updateSlot`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(doubt_sessions:manage)`)
- **Summary & Purpose**: Updates doubt slot details (meeting link, time, capacity, status).
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: UpdateSlotDto
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:86`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L86)
  - [`apps/web/server/doubt-sessions.server.ts:105`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L105)

#### `DELETE` /doubt-sessions/slots/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_deleteSlot`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(doubt_sessions:manage)`)
- **Summary & Purpose**: Deletes a doubt slot if no confirmed bookings exist.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:96`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L96)

#### `GET` /doubt-sessions/slots/{id}/bookings

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `DoubtSessionsController_getSlotBookings`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(doubt_sessions:manage)`)
- **Summary & Purpose**: Retrieves all student booking records for a specific doubt slot.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**: *None found in frontend codebase*

#### `PATCH` /doubt-sessions/bookings/{id}

- **Status**: ⚠️ Unused in Frontend
- **Operation ID**: `DoubtSessionsController_updateBooking`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN), Permissions(doubt_sessions:manage)`)
- **Summary & Purpose**: Admin updates booking record status or custom meeting link.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: UpdateBookingDto
- **Responses**: `200`
- **Callers in Web App**: *None found in frontend codebase*

#### `GET` /doubt-sessions/upcoming

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_getUpcomingSlots`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Lists all upcoming available doubt slots open for student booking.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:115`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L115)

#### `POST` /doubt-sessions/book

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_bookSlot`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Books a seat in an available doubt slot. Enforces slot capacity and prevents duplicate bookings.
- **Parameters**: None
- **Request Body**: BookSlotDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:125`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L125)

#### `POST` /doubt-sessions/bookings/{id}/cancel

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_cancelBooking`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Cancels student booking and decrements the slot current_bookings count.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:148`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L148)

#### `GET` /doubt-sessions/my-bookings

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `DoubtSessionsController_getMyBookings`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Lists current student upcoming and completed doubt session bookings with meeting links.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/doubt-sessions.server.ts:135`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/doubt-sessions.server.ts#L135)


### 3.17 Domain: Notifications (6 Endpoints)

#### `GET` /notifications/my

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `NotificationsController_getMyNotifications`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Fetches paginated in-app notifications for the logged-in user.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/notifications.server.ts:32`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/notifications.server.ts#L32)

#### `GET` /notifications/unread-count

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `NotificationsController_getUnreadCount`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Returns total count of unread notifications for navbar bell icon.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/notifications.server.ts:43`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/notifications.server.ts#L43)

#### `PATCH` /notifications/{id}/read

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `NotificationsController_markRead`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Marks a specific notification as read.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/notifications.server.ts:52`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/notifications.server.ts#L52)

#### `POST` /notifications/mark-all-read

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `NotificationsController_markAllRead`
- **Access Control**: Authenticated (Guard: `JWT`)
- **Summary & Purpose**: Marks all unread notifications for the user as read.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/notifications.server.ts:63`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/notifications.server.ts#L63)

#### `POST` /notifications/broadcast

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `NotificationsController_broadcast`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Broadcasts system-wide notification to all registered users.
- **Parameters**: None
- **Request Body**: BroadcastNotificationDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/notifications.server.ts:74`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/notifications.server.ts#L74)

#### `POST` /notifications/send

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `NotificationsController_send`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Sends a direct notification to a specific recipient user.
- **Parameters**: None
- **Request Body**: SendNotificationDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/notifications.server.ts:85`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/notifications.server.ts#L85)


### 3.18 Domain: Student Queries (7 Endpoints)

#### `POST` /student-queries

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `StudentQueriesController_create`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Submits a student support query or doubt question to instructors.
- **Parameters**: None
- **Request Body**: CreateQueryDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student-queries.server.ts:37`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L37)
  - [`apps/web/server/student-queries.server.ts:71`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L71)
  - [`apps/web/server/student-queries.server.ts:82`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L82)

#### `GET` /student-queries

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `StudentQueriesController_findAll`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Lists all student queries for admin inbox with optional status filter (open, answered, closed).
- **Parameters**:
  - `status*` (query, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student-queries.server.ts:50`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L50)
  - [`apps/web/server/student-queries.server.ts:59`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L59)

#### `GET` /student-queries/my

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `StudentQueriesController_getMyQueries`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Lists all queries submitted by the logged-in student along with instructor replies.
- **Parameters**: None
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student-queries.server.ts:50`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L50)

#### `POST` /student-queries/extra-attempt

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `StudentQueriesController_requestExtraAttempt`
- **Access Control**: Student (Guard: `JWT`)
- **Summary & Purpose**: Submits a formal request for an extra attempt grant on an assignment or test.
- **Parameters**: None
- **Request Body**: RequestExtraAttemptDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student-queries.server.ts:71`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L71)

#### `GET` /student-queries/{id}

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `StudentQueriesController_findOne`
- **Access Control**: Authenticated (Guard: `JWT (Author or Admin)`)
- **Summary & Purpose**: Retrieves query thread details and message history.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: None
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student-queries.server.ts:50`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L50)

#### `PATCH` /student-queries/{id}/reply

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `StudentQueriesController_reply`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Sends instructor response to student query, sets status to answered, and sends notification to student.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: ReplyQueryDto
- **Responses**: `200`
- **Callers in Web App**:
  - [`apps/web/server/student-queries.server.ts:93`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L93)

#### `POST` /student-queries/{id}/grant-attempt

- **Status**: 🟢 Active (Used in Web)
- **Operation ID**: `StudentQueriesController_grantExtraAttempt`
- **Access Control**: Admin / Sub-Admin (Guard: `Roles(ADMIN, SUB_ADMIN)`)
- **Summary & Purpose**: Approves extra attempt request, updates query status to answered, and inserts attempt grant record in assessment_attempt_grants table.
- **Parameters**:
  - `id*` (path, string)
- **Request Body**: GrantExtraAttemptDto
- **Responses**: `201`
- **Callers in Web App**:
  - [`apps/web/server/student-queries.server.ts:82`](file:///home/sahi/Downloads/technical-pilot-lms/apps/web/server/student-queries.server.ts#L82)

