'use client';

import { useState } from 'react';
import { createEnrollment, getCourseEnrollments, Enrollment } from '@/server/admin/enrollments.server';
import { Button } from '@repo/shadcn/button';
import { Card } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { toast } from '@repo/shadcn/sonner';

export function EnrollmentsClient() {
  const [courseId, setCourseId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!courseId.trim()) return;
    setLoading(true);
    const data = await getCourseEnrollments(courseId.trim());
    setEnrollments(data);
    setLoading(false);
  };

  const handleEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!studentId.trim() || !courseId.trim()) {
      toast.error('Enter both student ID and course ID');
      return;
    }
    setLoading(true);
    const result = await createEnrollment(studentId.trim(), courseId.trim());
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Student enrolled');
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Enrollments</h1>

      <Card className="p-4 space-y-4">
        <div className="flex gap-2">
          <input
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="Course ID (UUID)"
            className="border rounded px-3 py-2 flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
        </div>

        <form onSubmit={handleEnroll} className="flex gap-2">
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Student ID (UUID) to enroll"
            className="border rounded px-3 py-2 flex-1"
          />
          <Button type="submit" disabled={loading}>
            Enroll Student
          </Button>
        </form>
      </Card>

      <div className="grid gap-3">
        {enrollments.length === 0 && courseId && !loading && (
          <p className="text-muted-foreground">No enrollments for this course.</p>
        )}
        {enrollments.map((en) => (
          <Card key={en.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {en.profiles?.full_name ?? en.profiles?.email ?? en.student_id}
              </p>
              <p className="text-xs text-muted-foreground">
                Enrolled: {new Date(en.enrolled_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={en.status === 'active' ? 'default' : 'secondary'}>
              {en.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
