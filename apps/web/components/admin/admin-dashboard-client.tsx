'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import { Users, BookOpen, GraduationCap } from '@repo/shadcn/lucide';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import type { OverviewData } from '@/server/admin/analytics.server';

interface Props {
  overview: OverviewData | null;
}

export function AdminDashboardClient({ overview }: Props) {
  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-lg">
          No data available. Check back later.
        </p>
      </div>
    );
  }

  const completionChartData = overview.courseCompletionStats.map((c) => ({
    name: c.title.length > 20 ? c.title.slice(0, 20) + '...' : c.title,
    enrolled: c.enrolled,
    completed: c.completed,
  }));

  const enrollmentChartData = overview.enrollmentTrend.length > 0
    ? overview.enrollmentTrend
    : overview.enrollmentsByMonth.map((e) => ({ month: e.month, enrollments: e.count, signups: 0 }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Students"
          value={overview.totalStudents}
          icon={<Users className="size-4 sm:size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Total Enrollments"
          value={overview.totalEnrollments}
          subtitle={`${overview.activeEnrollments} active`}
          icon={<BookOpen className="size-4 sm:size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Completed"
          value={overview.completedEnrollments}
          subtitle={
            overview.totalEnrollments > 0
              ? `${Math.round((overview.completedEnrollments / overview.totalEnrollments) * 100)}%`
              : undefined
          }
          icon={<GraduationCap className="size-4 sm:size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Active Courses"
          value={overview.publishedCourses}
          subtitle={`${overview.totalCourses} total`}
          icon={<GraduationCap className="size-4 sm:size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Revenue"
          value={`₹${overview.totalRevenue.toLocaleString('en-IN')}`}
          icon={
            <span className="text-sm sm:text-lg font-semibold text-muted-foreground">
              ₹
            </span>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Enrollment Trend */}
        <Card>
          <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">Signups vs Enrollments</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
            {enrollmentChartData.length === 0 ? (
              <p className="text-muted-foreground text-xs sm:text-sm text-center py-12">
                No enrollment data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={enrollmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.18)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      fontSize: 12,
                      backdropFilter: 'blur(10px)',
                      opacity: 0.45,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    name="Student signups"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    name="Enrollments"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Course Completion */}
        <Card>
          <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">Course Completion</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
            {completionChartData.length === 0 ? (
              <p className="text-muted-foreground text-xs sm:text-sm text-center py-12">
                No course data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={completionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--foreground)', fillOpacity: 0.06 }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.18)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      fontSize: 12,
                      backdropFilter: 'blur(10px)',
                      opacity: 0.45,
                    }}
                  />
                  <Bar
                    dataKey="enrolled"
                    name="Enrolled"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Stats Table */}
      {overview.courseCompletionStats.length > 0 && (
        <Card>
          <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">Course Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="w-full overflow-x-auto">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 sm:px-4">Course</TableHead>
                    <TableHead className="px-3 sm:px-4 text-right">Enrolled</TableHead>
                    <TableHead className="px-3 sm:px-4 text-right">Completed</TableHead>
                    <TableHead className="px-3 sm:px-4 text-right">Avg Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.courseCompletionStats.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className="px-3 sm:px-4 font-medium max-w-[180px] sm:max-w-[250px] truncate">
                        {course.title}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 text-right">
                        {course.enrolled}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 text-right">
                        {course.completed}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 text-right">
                        {Math.round(course.avgProgress)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Enrollments Table */}
      {overview.recentEnrollments.length > 0 && (
        <Card>
          <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-sm sm:text-base">Recent Enrollments</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="w-full overflow-x-auto">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 sm:px-4">Student</TableHead>
                    <TableHead className="px-3 sm:px-4">Course</TableHead>
                    <TableHead className="px-3 sm:px-4">Date</TableHead>
                    <TableHead className="px-3 sm:px-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="px-3 sm:px-4">
                        <div>
                          <div className="font-medium text-xs sm:text-sm">
                            {enrollment.studentName}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-none">
                            {enrollment.studentEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 max-w-[140px] sm:max-w-[200px] truncate">
                        {enrollment.courseTitle}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4">
                        <StatusBadge status={enrollment.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 sm:pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-base sm:text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className="rounded-full p-1.5 sm:p-2 bg-muted shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const variant =
    lower === 'active'
      ? 'default'
      : lower === 'completed'
        ? 'secondary'
        : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
}
