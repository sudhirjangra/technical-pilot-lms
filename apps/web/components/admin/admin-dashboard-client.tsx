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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Students"
          value={overview.totalStudents}
          icon={<Users className="size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Total Enrollments"
          value={overview.totalEnrollments}
          subtitle={`${overview.activeEnrollments} active`}
          icon={<BookOpen className="size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Completed"
          value={overview.completedEnrollments}
          subtitle={
            overview.totalEnrollments > 0
              ? `${Math.round((overview.completedEnrollments / overview.totalEnrollments) * 100)}% of enrollments`
              : undefined
          }
          icon={<GraduationCap className="size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Active Courses"
          value={overview.publishedCourses}
          subtitle={`${overview.totalCourses} total`}
          icon={<GraduationCap className="size-5 text-muted-foreground" />}
        />
        <StatCard
          title="Revenue"
          value={`₹${overview.totalRevenue.toLocaleString('en-IN')}`}
          icon={
            <span className="text-lg font-semibold text-muted-foreground">
              ₹
            </span>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Enrollment Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups vs Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">
                No enrollment data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={enrollmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.18)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      fontSize: 13,
                      backdropFilter: 'blur(10px)',
                      opacity: 0.45,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
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
          <CardHeader>
            <CardTitle className="text-base">Course Completion</CardTitle>
          </CardHeader>
          <CardContent>
            {completionChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">
                No course data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--foreground)', fillOpacity: 0.06 }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.18)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      fontSize: 13,
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
          <CardHeader>
            <CardTitle className="text-base">Course Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Avg Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.courseCompletionStats.map((course) => (
                  <TableRow key={course.courseId}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {course.title}
                    </TableCell>
                    <TableCell className="text-right">
                      {course.enrolled}
                    </TableCell>
                    <TableCell className="text-right">
                      {course.completed}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(course.avgProgress)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Enrollments Table */}
      {overview.recentEnrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {enrollment.studentName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {enrollment.studentEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {enrollment.courseTitle}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={enrollment.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-full p-2 bg-muted">{icon}</div>
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
