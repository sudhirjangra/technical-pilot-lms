'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  broadcastNotification,
  sendNotification,
  type NotificationLog,
} from '@/server/notifications.server';
import { type Course } from '@/server/admin/courses.server';
import { type AdminUser } from '@/server/admin/users.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { Textarea } from '@repo/shadcn/textarea';
import { Badge } from '@repo/shadcn/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Filter,
  GraduationCap,
  History,
  Megaphone,
  Radio,
  Search,
  Send,
  Sparkles,
  TicketPlus,
  Trophy,
  User,
  Users,
} from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import { cn } from '@repo/shadcn/lib/utils';

type TargetMode = 'all' | 'course' | 'student';

const NOTIFICATION_TYPES = [
  { value: 'announcement', label: 'General Announcement', icon: Megaphone, desc: 'Platform updates, scheduling notices, or reminders' },
  { value: 'course_added', label: 'Curriculum / Course Update', icon: GraduationCap, desc: 'New chapters, lessons, or material available' },
  { value: 'congratulation', label: 'Achievement & Congratulation', icon: Trophy, desc: 'Exam milestone, top ranking, or completion' },
  { value: 'offer', label: 'Special Notice / Benefit', icon: Sparkles, desc: 'Discounts, extra session vouchers, or perks' },
  { value: 'alert', label: 'Important Alert', icon: AlertTriangle, desc: 'Urgent flight briefing or account requirement' },
];

export function AdminNotificationsClient({
  courses,
  students,
  initialLogs,
}: {
  courses: Course[];
  students: AdminUser[];
  initialLogs: NotificationLog[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [notificationType, setNotificationType] = useState<string>('announcement');
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');

  // Log filter State
  const [logSearch, setLogSearch] = useState<string>('');

  // Filter students by search
  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      (s.full_name ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    );
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const handleSend = () => {
    if (!title.trim()) {
      toast.error('Please enter a notification title');
      return;
    }

    if (targetMode === 'course' && !selectedCourseId) {
      toast.error('Please select a target course');
      return;
    }

    if (targetMode === 'student' && !selectedStudentId) {
      toast.error('Please select a student recipient');
      return;
    }

    startTransition(async () => {
      let result;
      if (targetMode === 'student') {
        result = await sendNotification(
          selectedStudentId,
          title.trim(),
          body.trim(),
          notificationType,
          { studentName: selectedStudent?.full_name ?? selectedStudent?.email },
        );
      } else {
        result = await broadcastNotification(
          title.trim(),
          body.trim(),
          notificationType,
          targetMode === 'course' ? selectedCourseId : undefined,
        );
      }

      if (result.error) {
        toast.error(
          typeof result.error === 'string' ? result.error : 'Failed to send notification',
        );
        return;
      }

      toast.success(
        targetMode === 'student'
          ? `Notification sent to ${selectedStudent?.full_name || selectedStudent?.email}`
          : targetMode === 'course'
            ? `Broadcast dispatched to students enrolled in "${selectedCourse?.title}"`
            : 'Broadcast dispatched to all active students',
      );

      // Reset form
      setTitle('');
      setBody('');
      if (targetMode === 'student') setSelectedStudentId('');
      router.refresh();
    });
  };

  const defaultType = NOTIFICATION_TYPES[0]!;
  const selectedTypeInfo = NOTIFICATION_TYPES.find((t) => t.value === notificationType) ?? defaultType;
  const TypeIcon = selectedTypeInfo.icon;

  const filteredLogs = initialLogs.filter((log) => {
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      log.title.toLowerCase().includes(q) ||
      (log.body ?? '').toLowerCase().includes(q) ||
      (log.profiles?.full_name ?? '').toLowerCase().includes(q) ||
      (log.profiles?.email ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Bell className="size-5 text-primary" />
          Notification Dispatch & Announcements
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Broadcast announcements, curriculum updates, or send direct in-app notifications to individual pilots.
        </p>
      </div>

      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full sm:w-80 h-auto p-1 text-xs sm:text-sm">
          <TabsTrigger value="compose" className="gap-1.5 py-1.5 px-3">
            <Send className="size-3.5" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 py-1.5 px-3">
            <History className="size-3.5" />
            Dispatch Log ({initialLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* ── COMPOSE TAB ── */}
        <TabsContent value="compose" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left 2 Cols: Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Target Audience Card */}
              <Card>
                <CardHeader className="p-3 sm:p-5 pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Radio className="size-4 text-primary" />
                    1. Select Target Audience
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose who will receive this in-app notification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-5 pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetMode('all')}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all',
                        targetMode === 'all'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30 font-medium'
                          : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <Users className="size-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs text-foreground font-semibold">All Active Students</p>
                        <p className="text-[10px] text-muted-foreground">Platform-wide broadcast</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetMode('course')}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all',
                        targetMode === 'course'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30 font-medium'
                          : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <GraduationCap className="size-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs text-foreground font-semibold">Enrolled in Course</p>
                        <p className="text-[10px] text-muted-foreground">Specific batch / course</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetMode('student')}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all',
                        targetMode === 'student'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30 font-medium'
                          : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <User className="size-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs text-foreground font-semibold">Specific Student</p>
                        <p className="text-[10px] text-muted-foreground">1-on-1 direct message</p>
                      </div>
                    </button>
                  </div>

                  {/* Course Dropdown */}
                  {targetMode === 'course' && (
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-xs">Choose Target Course</Label>
                      <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger className="h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Select course..." />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs sm:text-sm">
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Student Search & Select */}
                  {targetMode === 'student' && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs">Search & Select Student</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search student by name or email..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="h-9 pl-8 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-md border p-1 space-y-1 bg-muted/20">
                        {filteredStudents.length === 0 ? (
                          <p className="p-3 text-center text-xs text-muted-foreground">No students found matching search.</p>
                        ) : (
                          filteredStudents.slice(0, 30).map((s) => {
                            const isSelected = selectedStudentId === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedStudentId(s.id)}
                                className={cn(
                                  'w-full flex items-center justify-between p-2 rounded text-left text-xs transition-colors',
                                  isSelected
                                    ? 'bg-primary text-primary-foreground font-medium'
                                    : 'hover:bg-muted text-foreground',
                                )}
                              >
                                <div className="truncate min-w-0 pr-2">
                                  <p className="font-medium truncate">{s.full_name || 'Pilot Student'}</p>
                                  <p className={cn('text-[10px] truncate', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                                    {s.email}
                                  </p>
                                </div>
                                {isSelected && <CheckCircle2 className="size-3.5 shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>

                      {selectedStudent && (
                        <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20 text-xs">
                          <User className="size-3.5 text-primary" />
                          <span>Recipient: <strong>{selectedStudent.full_name || 'Pilot'}</strong> ({selectedStudent.email})</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Message Details Card */}
              <Card>
                <CardHeader className="p-3 sm:p-5 pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Megaphone className="size-4 text-primary" />
                    2. Notification Content & Type
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-5 pt-0 space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notification Category / Intent</Label>
                    <Select value={notificationType} onValueChange={setNotificationType}>
                      <SelectTrigger className="h-9 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs sm:text-sm">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">{selectedTypeInfo.desc}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notif-title" className="text-xs">Notification Header / Title</Label>
                    <Input
                      id="notif-title"
                      placeholder="e.g. Navigation Systems Chapter 4 Updated"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={160}
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notif-body" className="text-xs">Detailed Message Body (Optional)</Label>
                    <Textarea
                      id="notif-body"
                      placeholder="Provide full context, action required, or announcement details..."
                      rows={4}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={1500}
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleSend}
                      disabled={isPending || !title.trim()}
                      className="h-9 px-6 text-xs sm:text-sm gap-2 w-full sm:w-auto"
                    >
                      <Send className="size-3.5" />
                      {isPending ? 'Dispatching...' : 'Send Notification Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Live Preview */}
            <div className="space-y-4">
              <Card className="sticky top-20">
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    Student Inbox Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    This is exactly how your notification will appear in the student's topbar notification popover:
                  </p>

                  <div className="rounded-xl border border-primary/30 bg-card p-3 shadow-md space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <TypeIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground leading-snug">
                          {title.trim() || 'Notification Title Preview'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-3">
                          {body.trim() || 'Your notification message body will be rendered here for the pilot students.'}
                        </p>
                        <p className="mt-1.5 text-[9px] text-muted-foreground">Just now</p>
                      </div>
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-2.5 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">Target Audience Summary:</p>
                    <p>
                      • {targetMode === 'all' && 'All registered & active students across LMS.'}
                      • {targetMode === 'course' && (selectedCourse ? `Only students with active enrollments in "${selectedCourse.title}".` : 'Select a course above.')}
                      • {targetMode === 'student' && (selectedStudent ? `Direct 1-on-1 alert to ${selectedStudent.full_name || selectedStudent.email}.` : 'Select a student above.')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="p-3 sm:p-5 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base">Recent Notification Dispatches</CardTitle>
                  <CardDescription className="text-xs">Log of sent announcements, system alerts, and direct notifications.</CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search dispatch logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-5 pt-0">
              <div className="overflow-x-auto">
                <Table className="text-xs min-w-[550px]">
                  <TableHeader>
                    <tr className="border-b bg-muted/30">
                      <TableHead className="px-3 py-2 text-xs font-semibold">Date</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold">Recipient</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold">Type</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold">Title & Message</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold text-center">Status</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No notification dispatches found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/20">
                          <TableCell className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 font-medium">
                            {log.profiles ? (
                              <div>
                                <p className="text-xs font-semibold text-foreground">{log.profiles.full_name || 'Pilot'}</p>
                                <p className="text-[10px] text-muted-foreground">{log.profiles.email}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Direct / Broadcast</span>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {log.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 max-w-[280px]">
                            <p className="font-semibold text-foreground truncate">{log.title}</p>
                            {log.body && (
                              <p className="text-[11px] text-muted-foreground truncate">{log.body}</p>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-center">
                            {log.is_read ? (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Read
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                                Delivered
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
