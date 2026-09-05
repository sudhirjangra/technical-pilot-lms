export interface PermissionItem {
  slug: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'courses',
    name: 'Courses & Content',
    description: 'Manage curriculum, lessons, modules, and course status',
    permissions: [
      {
        slug: 'courses:read',
        label: 'View Courses & Lessons',
        description: 'Read-only access to course curriculum, chapters, and lesson assets.',
      },
      {
        slug: 'courses:write',
        label: 'Create & Edit Courses',
        description: 'Add or modify courses, chapters, video lessons, and PDF materials.',
      },
      {
        slug: 'courses:publish',
        label: 'Publish & Archive Courses',
        description: 'Control live visibility of courses for student catalog enrollment.',
      },
    ],
  },
  {
    id: 'students',
    name: 'Students & Enrollments',
    description: 'Monitor student accounts, sessions, and course enrollments',
    permissions: [
      {
        slug: 'students:read',
        label: 'View Student Directory',
        description: 'Search and inspect registered student profiles and progress history.',
      },
      {
        slug: 'students:manage_devices',
        label: 'Manage Student Devices',
        description: 'Inspect active device sessions and sign out rogue devices.',
      },
      {
        slug: 'enrollments:read',
        label: 'View Course Enrollments',
        description: 'Monitor student enrollment status and completion dates.',
      },
      {
        slug: 'enrollments:write',
        label: 'Enroll & Revoke Access',
        description: 'Manually grant or revoke course access for individual students.',
      },
    ],
  },
  {
    id: 'assessments',
    name: 'Assessments & Grading',
    description: 'Manage assignments, tests, question banks, and evaluate student submissions',
    permissions: [
      {
        slug: 'assignments:read',
        label: 'View Assignments',
        description: 'Inspect assignment guidelines and student submission history.',
      },
      {
        slug: 'assignments:write',
        label: 'Manage Assignments',
        description: 'Create and update flight assignments and guidelines.',
      },
      {
        slug: 'assignments:grade',
        label: 'Grade Assignments',
        description: 'Evaluate written responses and assign scores / feedback.',
      },
      {
        slug: 'tests:read',
        label: 'View Tests & Questions',
        description: 'Browse assessment test blueprints and question banks.',
      },
      {
        slug: 'tests:write',
        label: 'Manage Test Bank',
        description: 'Create, update, and bulk-import MCQ / MSQ questions.',
      },
      {
        slug: 'tests:grade',
        label: 'Grade Tests & Overrides',
        description: 'Manually review test results and grant extra attempts.',
      },
    ],
  },
  {
    id: 'support',
    name: 'Doubts & Inquiries',
    description: 'Schedule doubt sessions and answer student questions',
    permissions: [
      {
        slug: 'doubt_sessions:manage',
        label: 'Manage Doubt Sessions',
        description: 'Schedule, edit, and cancel 1-on-1 / group live doubt slots.',
      },
      {
        slug: 'queries:read',
        label: 'View Inquiries',
        description: 'Read student inquiry tickets and question threads.',
      },
      {
        slug: 'queries:reply',
        label: 'Reply to Queries',
        description: 'Submit Technical Pilot answers and resolve student tickets.',
      },
    ],
  },
  {
    id: 'finance',
    name: 'Finance & Payments',
    description: 'Review student payment orders, invoices, and process refunds',
    permissions: [
      {
        slug: 'payments:read',
        label: 'View Payments & Invoices',
        description: 'Access transaction history, revenue logs, and tax invoices.',
      },
      {
        slug: 'payments:refund',
        label: 'Process Refunds',
        description: 'Initiate and manage Razorpay refunds for eligible students.',
      },
    ],
  },
  {
    id: 'reports',
    name: 'Analytics & Reports',
    description: 'Platform analytics, enrollment trends, and data exports',
    permissions: [
      {
        slug: 'reports:read',
        label: 'View Platform Analytics',
        description: 'View dashboard KPIs, enrollment curves, and completion stats.',
      },
      {
        slug: 'reports:export',
        label: 'Export Data (CSV / XLSX)',
        description: 'Export student lists, payments, and attempt spreadsheets.',
      },
    ],
  },
];

export const PERMISSION_MAP = new Map(
  PERMISSION_GROUPS.flatMap((g) => g.permissions).map((p) => [p.slug, p]),
);

export function getPermissionLabel(slug: string): string {
  return PERMISSION_MAP.get(slug)?.label ?? slug;
}
