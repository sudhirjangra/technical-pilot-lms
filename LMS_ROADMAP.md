# LMS Roadmap

This is a forward-looking backlog. The shipped baseline is summarized in `STATE.md`; completed work must not be treated as pending.

## Current Product Baseline

- Students can register, authenticate, manage devices, browse/purchase/enroll in courses, watch protected VdoCipher videos, view protected PDFs, complete assignments/tests, review attempts, track progress, receive notifications, and book doubt sessions.
- Admins can manage courses and media, students and enrollments, assessments and grading, payments/refunds, notifications, doubt sessions, permissions, and analytics.
- Supabase is used for PostgreSQL, Auth, RLS, Storage, and selected private-media flows. Razorpay handles payments. VdoCipher handles DRM playback.

## Next Small Tasks

Each item should be promoted to `STATE.md` before implementation and completed independently.

1. Verify and repair the live My Bookings data path.
2. Apply and verify committed Supabase migrations in the target environment.
3. Finish granular permissions for assignment/test CRUD.
4. Add admin student payment and device-activity tabs.
5. Add server-side CSV/XLSX exports.
6. Add Realtime doubt-slot capacity and meeting-link updates.

## Later, Explicitly Deferred

- MFA for privileged accounts.
- Course and lesson full-text search.
- Enrollment expiry automation and other pg_cron jobs.
- Certificates and public certificate verification.
- Course recommendations with pgvector.
- Edge-function extraction of payment/web-video integrations.

These items are not active tasks until the user selects one and it is placed in `STATE.md`.


Immediate Next Step:
# Technical Pilot Portal — Master Implementation Specification

Purpose: This document converts the requested changes into a trackable implementation specification for the coding agent. Each requirement has a unique ID, a clear expected behavior, and acceptance criteria.

Important: Preserve the meaning of every requested feature. Do not replace a required behavior with a different business rule, and do not consider a feature complete if only its UI has been changed.

## 0. Project-Wide Rules and Architecture

### TP-ARCH-001 — MongoDB for Assignment/Test Attempt History

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

Use MongoDB as the primary storage for submitted assignment and test attempt history, instead of storing the complete attempt history in Supabase.

Required implementation

1. When a student completes/submits an assignment or test, create a unique attempt ID.

2. Store the complete attempt record in MongoDB.

3. Store the corresponding attempt ID in Supabase so the student's enrollment/assignment/test record can reference the attempt.

4. Use the Supabase attempt ID to retrieve the detailed attempt history from MongoDB.

5. Refactor the existing attempt-history fetching logic so it is reliable and not dependent on complex Supabase queries.

6. Preserve existing attempt history during migration.

7. Ensure every attempt has a stable, unique identifier and cannot be confused with another attempt.

Attempt record should contain relevant information such as:

* Attempt ID

* Student ID

* Course ID

* Assignment/Test ID

* Submission date/time

* Attempt number

* Questions and submitted answers

* Correct answers, where applicable

* Marks/score

* Total marks

* Percentage

* Pass/fail status

* Time taken, where available

* Question-wise results

* Relevant question categories

* Any other information required to display the attempt history accurately

Acceptance criteria

* ☐ Every submitted assignment/test creates a unique attempt ID.

* ☐ Complete attempt history is stored in MongoDB.

* ☐ Supabase stores the attempt ID reference.

* ☐ Attempt history can be fetched reliably using the reference.

* ☐ Existing attempts remain accessible after migration.

* ☐ No duplicate or missing attempt records are created during submission.

* ☐ Student attempt history, scores, and status remain accurate.

### TP-ARCH-002 — Remove Manual Grading Entirely

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

Remove the concept of manual grading from the entire system.

This must be removed from both:

* Frontend/web

* Backend/API

Required implementation

1. Remove manual grading UI and related controls.

2. Remove manual grading APIs, services, and backend logic.

3. Remove any automatic/manual grading workflow that resets marks or changes attempted test results incorrectly.

4. Ensure submitted assignments/tests are evaluated and their marks/status are preserved correctly.

5. Do not allow any manual grading action to overwrite an already calculated score.

6. Do not allow a test to show 0 marks merely because it was previously passed or completed.

7. Ensure assignment/test completion and pass/fail status are derived from the correct stored attempt result.

Acceptance criteria

* ☐ Manual grading is removed from the web application.

* ☐ Manual grading is removed from backend/API.

* ☐ No manual grading action can reset marks.

* ☐ Submitted test marks remain correct.

* ☐ Assignment status and test status remain consistent with the actual result.

* ☐ A completed/passed test does not incorrectly show 0 marks.

* ☐ Existing submitted attempts are not corrupted.

## 1. Assignment/Test Attempt Limits

### TP-ATT-001 — Unlimited Attempts

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

If the admin sets `attempts = 0`, the student must have unlimited attempts.

If the admin sets a number greater than zero, the student must have only that many attempts.

Acceptance criteria

* ☐ `attempts = 0` → unlimited attempts.

* ☐ `attempts = 3` → maximum 3 attempts.

* ☐ Backend enforces the limit.

* ☐ Refreshing or reopening cannot bypass the limit.

* ☐ Existing attempt history is preserved.

### TP-ATT-002 — Attempt Display

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

When attempts are unlimited, the student assignment/test window must show only the number of attempts used/tried.

Do not show a total-attempt limit such as `0`, `∞`, or `0 remaining`.

For limited attempts, show the configured limit and relevant remaining/used information.

## 2. Student Weak-Point Analysis

### TP-ANALYSIS-001 — Question Categorization

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Questions must support categorization by:

* Course/Subject

* Topic

* Subtopic/Section

* Question type, such as:

  * Calculation

  * Reasoning

  * Numerical

  * Other relevant types

* Difficulty:

  * Easy

  * Medium

  * Hard

### TP-ANALYSIS-002 — Weak-Point Detection

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Analyze assignment and test attempts to identify weak:

* Topics

* Sections

* Question types

* Difficulty levels

Use actual performance data. Do not label a category as weak based only on the number of questions.

### TP-ANALYSIS-003 — Student-Facing Analysis

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Show students:

* Overall performance

* Weak topics/sections

* Weak question types

* Performance by difficulty

* Suggestions for what to study/practice next

### TP-ANALYSIS-004 — Relevant Charts

Priority: Medium Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Use suitable charts to visualize the analysis, such as:

* Bar charts for topic-wise performance

* Pie/donut charts where appropriate

* Other relevant charts where they improve understanding

Charts must be based on actual student data and should not be misleading.

## 3. Other Subjects/Courses Status — Notification-Based Marketing

### TP-MKT-001 — Periodic Course-Status Notifications

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

If a student has purchased course A out of A/B/C/D, periodically ask about the other courses.

### TP-MKT-002 — Notification Targeting

Admin must be able to target:

* All students

* Students enrolled in a specific course

* Specific students

### TP-MKT-003 — Personalized Form

The notification must navigate to a personalized form asking about other subjects/courses.

The form should allow students to indicate whether they:

* Have completed the course already

* Are studying it elsewhere

* Have not started it

* Have other remarks

### TP-MKT-004 — Marketing Data

Store responses and remarks so admin can review them and target marketing campaigns for relevant courses.

Do not assume that a student who has not purchased a course has never studied it elsewhere.

## 4. Admin Dashboard

### TP-ADMIN-001 — Remove Revenue

Priority: Medium Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Remove revenue from the admin dashboard, including related cards/metrics.

Do not remove unrelated payment functionality.

## 5. Support Before Login

### TP-SUPPORT-001 — Contact Us Link

Priority: Medium Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Add a Contact Us/Support link on login and signup screens.

### TP-SUPPORT-002 — Contact Form

The form must collect:

* Name

* Email

* Mobile number

* Query/message

It must work without login and provide validation and success/error feedback.

## 6. Student ID, DOB Removal, and Referral Code

### TP-STUDENT-001 — Unique Student ID

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Assign every student a unique student ID generated using their email and mobile number.

Use the student ID as the primary student identifier instead of email throughout the portal.

Preserve existing student data and update references carefully.

### TP-STUDENT-002 — Remove DOB

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Remove DOB entirely from:

* Signup

* Student profiles

* Admin views

* Backend handling

* Other student-facing forms

Do not continue collecting DOB through hidden fields or other forms.

### TP-STUDENT-003 — Unique Referral Code

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Assign every user a unique referral code beginning with `TP`, followed by the required unique characters.

Every user must be able to view their referral code.

## 7. Refund and Razorpay Safety

### TP-PAY-001 — Remove Refund Option

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Remove refund options from admin payments.

Remove refund buttons, actions, backend endpoints, and services.

### TP-PAY-002 — Remove Admin Money-Deduction Functions

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Remove all functions/components that can cause money to be deducted from the admin's Razorpay account through admin actions.

This includes:

* Refunds

* Reversals

* Transfers

* Payouts

* Other admin-side money-deduction operations

Do not merely hide buttons. Remove or disable the underlying backend functionality and verify that direct API requests cannot trigger it.

Important: Normal student purchase/payment processing must continue to work.

## 8. Course-Based Doubt Sessions and Notifications

### TP-DOUBT-001 — Merge Notification and Doubt Session Management

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Organize doubt sessions and notifications into one clear, user-friendly admin workflow.

### TP-DOUBT-002 — Targeting

Admin must be able to create doubt sessions for:

* All students

* Students enrolled in a specific course

* Specific students

### TP-DOUBT-003 — Course-Based Access

If a course is selected, only enrolled students should receive/access the session.

If a specific student is selected, only that student should receive/access it.

### TP-DOUBT-004 — Fix Admin Creation

Fix the existing issue where admin cannot create a doubt session.

Ensure the full flow works:

Create → Target → Save → Notify → Student Access

## 9. Purchase Confirmation Email

### TP-EMAIL-001 — Successful Purchase Receipt

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

After a successful purchase, send a confirmation/receipt email to the student's registered email.

The email must confirm successful course purchase and enrollment.

No PDF should be generated or attached.

Handle email failures gracefully without incorrectly marking the purchase as failed.

## 10. Course Archiving

### TP-ARCHIVE-001 — Archive Notification

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

When admin archives a course, notify users that Technical Pilot (admin) has archived the course.

### TP-ARCHIVE-002 — Revoke Access

When archived:

* Revoke access for all students.

* Prevent enrolled and non-enrolled students from opening/viewing content.

* Show a dimmed course tile with Archived status.

* Enforce access restrictions in backend/API as well.

Preserve historical data.

## 11. Bulk Import — 2–3 Options

### TP-IMPORT-001 — Flexible Options

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

If A/B/C/D fields contain empty values, accept the question and map only the options with values.

Support:

* 2 options

* 3 options

* 4 options

Do not reject a question because some option fields are empty.

Correct-answer mapping must remain accurate.

## 12. VdoCipher Video Thumbnails

### TP-VIDEO-001 — Custom Thumbnail Upload

Priority: Medium Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Allow admin to upload a custom thumbnail for a video.

The thumbnail must be shown to students before video playback starts.

If no custom thumbnail exists, retain the existing fallback behavior.

Ensure thumbnails are associated with the correct video.

## 13. Course Expiry and Subscription Management

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

### TP-SUB-001 — No Lifetime Access

Courses must not automatically grant lifetime access.

Admin must be able to configure either:

* Fixed-duration access

* Subscription-based access

### TP-SUB-002 — Admin Plan Configuration

Admin must be able to set:

* Expiry duration in days

* Subscription duration

* Subscription price

* Available subscription plans

Example plans:

* ₹5,000 for 3 months

* ₹9,000 for 9 months

* ₹11,000 for 1 year

### TP-SUB-003 — Student Access and Expiry

When a student enrolls/purchases:

* Record enrollment/access start date.

* Calculate expiry date.

* Show remaining days.

* Revoke access when expired.

* Preserve progress.

### TP-SUB-004 — Renewal

Allow students to extend/renew access.

After renewal:

* Restore access.

* Preserve all progress.

* Do not create duplicate enrollments that disconnect progress.

* Handle renewal before and after expiry.

### TP-SUB-005 — Admin Visibility

Admin must see:

* Enrollment date

* Expiry date

* Remaining days

* Active/expired status

* Subscription plan

* Renewal history

* Relevant payment/enrollment records

### TP-SUB-006 — Exceptional Handling

Handle:

* Multiple purchases

* Renewal before expiry

* Renewal after expiry

* Multiple courses with different expiry dates

* Admin changing expiry configuration

* Payment succeeds but access update fails

* Access expires while viewing

* Direct access attempts after expiry

* Existing students enrolled before this feature

Do not assume lifetime access for existing students without defining migration behavior.

## 14. Touch Device Cursor Indicator

### TP-UI-001 — Remove Green Cursor Dot on Touch Devices

Priority: Medium Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Remove the green cursor dot on touch/mobile devices.

Keep desktop cursor behavior if it is part of the existing design.

## 15. Lesson, Chapter, and Course Descriptions

### TP-DESC-001 — Lesson/Chapter Descriptions

Priority: Medium Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Students must be able to see lesson and chapter descriptions in the appropriate views.

Preserve supported formatting.

### TP-DESC-002 — Course Description Editor

Give admin the same rich text editor used for relevant content.

It must accept pasted content with the same formatting support.

### TP-DESC-003 — Course Details Display

Show the course description on the course details page, before enrollment, in the area where Enroll Now information is shown.

## 16. Referral Credits and Manual Cash Conversion

### TP-REF-001 — Referral Relationship

Priority: High Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

A new user can enter a referral code during signup.

Store the referral relationship.

### TP-REF-002 — Referral Reward

When a referred user purchases a course:

* Calculate a configurable percentage of the course purchase amount.

* Award points/credits to the referring student.

* Do not automatically transfer money.

### TP-REF-003 — Referral Tracking

Every user must be able to see:

* Referral code

* Referred users

* Purchase status

* Points earned

* Points used/converted

* Remaining points balance

### TP-REF-004 — Manual Cash Conversion

Allow users to request conversion of points into real money.

The form must collect the required account details.

Admin must be able to:

* Review the request

* Validate it

* Manually send money directly

* Mark it as paid

* Update the remaining points balance

### TP-REF-005 — Conversion Safety

* Prevent duplicate payments for the same points.

* Preserve referral and conversion history.

* Handle partial conversion where applicable.

* Do not automatically deduct money from the admin's Razorpay account.

* Do not create an automatic payout flow.

## 17. Final Verification Checklist

Before marking the project complete:

* ☐ All requirements above are implemented.

* ☐ MongoDB attempt history is working reliably.

* ☐ Supabase stores attempt references.

* ☐ Manual grading is removed from frontend and backend.

* ☐ No incorrect score resets occur.

* ☐ Unlimited attempts work correctly.

* ☐ Weak-point analysis is based on real attempt data.

* ☐ Course-based doubt sessions work.

* ☐ Course expiry and renewal work without losing progress.

* ☐ Archived courses revoke access.

* ☐ Refund and admin money-deduction functionality is removed.

* ☐ Referral credits and manual conversion work correctly.

* ☐ Existing data is preserved.

* ☐ Backend access restrictions are enforced.

* ☐ All important edge cases are tested.

* ☐ No unrelated functionality is broken.

Deliverables: Updated frontend, backend, database changes/migrations, and a clear summary of what was changed and how each requirement was verified.


### TP-ARCH-003 — Attempt History Migration and Data Integrity

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

The migration to MongoDB must not break existing student records or attempt history.

Required implementation

* Inspect the existing Supabase attempt-history schema and identify all fields currently used by the frontend, backend, reports, and student dashboards.

* Define a MongoDB schema that preserves all required information.

* Migrate existing submitted attempts where applicable.

* Maintain a reliable mapping between the existing Supabase records and the new MongoDB attempt records.

* Ensure historical attempts remain accessible after migration.

* Do not create duplicate attempts during migration or when a student resubmits.

* Ensure the system can handle missing or incomplete historical data without crashing.

Acceptance criteria

* ☐ Existing attempt history remains accessible.

* ☐ Each historical attempt has a valid reference.

* ☐ New submissions use MongoDB.

* ☐ No duplicate attempt records are created.

* ☐ Student scores, completion status, and pass/fail status remain accurate.

* ☐ Failed or incomplete migration records are identified and handled safely.

### TP-ARCH-004 — Attempt History API and Fetching

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

Refactor the attempt-history API so that fetching attempts is simple, reliable, and consistent.

Required implementation

* Use the Supabase attempt ID to fetch the corresponding MongoDB attempt record.

* Avoid complex, fragile Supabase queries for complete attempt history.

* Ensure the API returns the same information required by existing student/admin screens.

* Handle missing attempt IDs, invalid references, and unavailable MongoDB records gracefully.

* Ensure the API does not return incorrect scores or mix attempts between students.

* Preserve the existing student-facing and admin-facing attempt-history functionality.

Acceptance criteria

* ☐ Attempt history loads correctly for all valid attempts.

* ☐ Missing/invalid references return a safe, understandable response.

* ☐ Student A cannot access Student B's attempt history.

* ☐ Attempt history remains accurate after multiple submissions.

* ☐ Existing screens continue to work with the new data source.

### TP-ARCH-005 — Remove Manual Grading Data Dependencies

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

Removing manual grading must also remove any data dependencies that cause marks or status to be reset.

Required implementation

* Identify all database fields, API logic, background jobs, and frontend logic related to manual grading.

* Remove or update any code that:

  * Resets marks after submission.

  * Resets test scores to 0.

  * Changes a passed test to an incorrect status.

  * Overwrites calculated marks with manual-grading values.

  * Depends on a manual-grading status to display results.

* Ensure the MongoDB attempt record is the authoritative source for submitted attempt results.

* Ensure Supabase references do not contain conflicting score/status values that override the actual attempt result.

Acceptance criteria

* ☐ No manual-grading dependency remains in the submission flow.

* ☐ Marks are not reset after submission.

* ☐ Passed tests remain passed with the correct marks.

* ☐ Assignment/test status is consistent with the actual attempt result.

* ☐ MongoDB attempt data is not overwritten by stale Supabase values.

### TP-ARCH-006 — Submission and Attempt History Consistency

Priority: Critical Status: ☐ Not started ☐ In progress ☐ Testing ☐ Complete

Requirement

The submission flow must reliably create and preserve attempt history.

Required implementation

When a student submits an assignment/test:

1. Validate the submission.

2. Determine the attempt number.

3. Generate a unique attempt ID.

4. Calculate the result.

5. Store the complete attempt in MongoDB.

6. Store the attempt ID reference in Supabase.

7. Update the relevant assignment/test status using the correct result.

8. Return the result to the student.

9. Ensure the student can immediately open the attempt history.

Acceptance criteria

* ☐ Submission creates exactly one attempt record.

* ☐ Attempt ID is unique.

* ☐ MongoDB record is created successfully.

* ☐ Supabase reference is stored correctly.

* ☐ Student can view the attempt immediately.

* ☐ Marks and status remain correct after refresh.

* ☐ Failed submission does not create a misleading completed/passed status.

* ☐ Retrying a failed request does not create duplicate attempts.

## Final Instruction to the Coding Agent

Do not start implementing blindly. First inspect the existing codebase and identify the current attempt-history, grading, enrollment, payment, and course-access flows. Then implement the changes in a way that preserves existing data and prevents conflicting logic from remaining in the system.

The MongoDB migration and removal of manual grading are especially important. Do not consider the project complete until submitted assignments/tests, attempt history, marks, and statuses are working reliably end-to-end.
