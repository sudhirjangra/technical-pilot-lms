import { getAdminCourses } from '@/server/admin/courses.server';
import { getUsers } from '@/server/admin/users.server';
import { getAdminNotificationLogs } from '@/server/notifications.server';
import { AdminNotificationsClient } from '@/components/admin/notifications-client';

export const metadata = {
  title: 'Notifications & Announcements — Admin',
};

export default async function AdminNotificationsPage() {
  const [courses, users, logs] = await Promise.all([
    getAdminCourses(),
    getUsers(),
    getAdminNotificationLogs(),
  ]);

  const students = users.filter((u) => u.role === 'student');

  return (
    <div className="p-3 sm:p-6">
      <AdminNotificationsClient
        courses={courses}
        students={students}
        initialLogs={logs}
      />
    </div>
  );
}
