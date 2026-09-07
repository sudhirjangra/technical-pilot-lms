'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Slot,
  createSlot,
  deleteSlot,
  cancelSlot,
  updateSlot,
} from '@/server/doubt-sessions.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { toast } from '@repo/shadcn/sonner';
import { Input } from '@repo/shadcn/input';
import { Textarea } from '@repo/shadcn/textarea';
import { Label } from '@repo/shadcn/label';
import { Checkbox } from '@repo/shadcn/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Send,
  Sparkles,
  User,
  Users,
  Video,
} from '@repo/shadcn/lucide';
import { cn } from '@repo/shadcn/lib/utils';

type TargetMode = 'all' | 'course' | 'student';

type CreateFormState = {
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_bookings: number;
  topic: string;
  description: string;
  meeting_link: string;
  target_type: TargetMode;
  course_id: string;
  student_id: string;
  notify_students: boolean;
};

type EditFormState = {
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_bookings: number;
  topic: string;
  description: string;
  meeting_link: string;
  target_type: TargetMode;
  course_id: string;
  student_id: string;
};

const emptyForm = (): CreateFormState => ({
  date: '',
  start_time: '',
  end_time: '',
  duration_minutes: 30,
  max_bookings: 1,
  topic: '',
  description: '',
  meeting_link: '',
  target_type: 'all',
  course_id: '',
  student_id: '',
  notify_students: true,
});

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function DoubtSlotsClient({
  slots,
  courses = [],
  students = [],
}: {
  slots: Slot[];
  courses?: { id: string; title: string }[];
  students?: { id: string; full_name?: string | null; email: string }[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateFormState>(emptyForm());
  const [studentSearch, setStudentSearch] = useState('');
  const [editStudentSearch, setEditStudentSearch] = useState('');

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    date: '',
    start_time: '',
    end_time: '',
    duration_minutes: 30,
    max_bookings: 1,
    topic: '',
    description: '',
    meeting_link: '',
    target_type: 'all',
    course_id: '',
    student_id: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Filter students by search
  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      (s.full_name ?? '').toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const filteredEditStudents = students.filter((s) => {
    if (!editStudentSearch.trim()) return true;
    const q = editStudentSearch.toLowerCase();
    return (
      (s.full_name ?? '').toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const selectedStudent = students.find((s) => s.id === form.student_id);
  const selectedCourse = courses.find((c) => c.id === form.course_id);

  function handleStartTimeChange(val: string) {
    setForm((prev) => {
      const newForm = { ...prev, start_time: val };
      if (val && prev.duration_minutes > 0) {
        const startMins = timeToMinutes(val);
        newForm.end_time = minutesToTime(startMins + prev.duration_minutes);
      }
      return newForm;
    });
  }

  function handleEndTimeChange(val: string) {
    setForm((prev) => {
      const newForm = { ...prev, end_time: val };
      if (prev.start_time && val) {
        const startMins = timeToMinutes(prev.start_time);
        const endMins = timeToMinutes(val);
        const diff = endMins - startMins;
        if (diff > 0) newForm.duration_minutes = diff;
      }
      return newForm;
    });
  }

  function handleDurationChange(val: number) {
    setForm((prev) => {
      const newForm = { ...prev, duration_minutes: val };
      if (prev.start_time && val > 0) {
        const startMins = timeToMinutes(prev.start_time);
        newForm.end_time = minutesToTime(startMins + val);
      }
      return newForm;
    });
  }

  const handleCreate = async () => {
    if (!form.date || !form.start_time || !form.end_time) {
      toast.error('Please enter session date, start time, and end time');
      return;
    }

    if (form.target_type === 'course' && !form.course_id) {
      toast.error('Please select a target course');
      return;
    }

    if (form.target_type === 'student' && !form.student_id) {
      toast.error('Please select a target student');
      return;
    }

    setLoading(true);
    const result = await createSlot({
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      duration_minutes: form.duration_minutes,
      max_bookings: form.max_bookings || 1,
      topic: form.topic || undefined,
      description: form.description || undefined,
      meeting_link: form.meeting_link || undefined,
      target_type: form.target_type,
      course_id: form.target_type === 'course' ? form.course_id : undefined,
      student_id: form.target_type === 'student' ? form.student_id : undefined,
      notify_students: form.notify_students,
    });
    setLoading(false);

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to create doubt session');
    } else {
      toast.success('Doubt session created successfully');
      setShowForm(false);
      setForm(emptyForm());
      router.refresh();
    }
  };

  const handleCancel = async (id: string) => {
    const result = await cancelSlot(id);
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to cancel slot');
    } else {
      toast.success('Slot marked as cancelled');
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this doubt session slot? All active bookings will be cancelled.')) return;
    const result = await deleteSlot(id);
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to delete slot');
    } else {
      toast.success('Slot deleted');
      router.refresh();
    }
  };

  const openEdit = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setEditForm({
      date: slot.date,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      duration_minutes: slot.duration_minutes,
      max_bookings: slot.max_bookings,
      topic: slot.topic ?? '',
      description: slot.description ?? '',
      meeting_link: slot.meeting_link ?? '',
      target_type: (slot.target_type as TargetMode) || 'all',
      course_id: slot.course_id ?? '',
      student_id: slot.student_id ?? '',
    });
  };

  const handleEdit = async (id: string) => {
    if (editForm.target_type === 'course' && !editForm.course_id) {
      toast.error('Please select a target course');
      return;
    }
    if (editForm.target_type === 'student' && !editForm.student_id) {
      toast.error('Please select a target student');
      return;
    }

    setEditLoading(true);
    const result = await updateSlot(id, {
      date: editForm.date || undefined,
      start_time: editForm.start_time || undefined,
      end_time: editForm.end_time || undefined,
      duration_minutes: editForm.duration_minutes || undefined,
      max_bookings: editForm.max_bookings || undefined,
      topic: editForm.topic || undefined,
      description: editForm.description || undefined,
      meeting_link: editForm.meeting_link || undefined,
      target_type: editForm.target_type,
      course_id: editForm.target_type === 'course' ? editForm.course_id : null,
      student_id: editForm.target_type === 'student' ? editForm.student_id : null,
    });
    setEditLoading(false);

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update slot');
    } else {
      toast.success('Slot updated successfully');
      setEditingSlotId(null);
      router.refresh();
    }
  };

  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header & Quick Navigation */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              Doubt Sessions & Clearances
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Schedule, target, and manage 1-on-1, course-specific, and platform-wide doubt clearing sessions.
            </p>
          </div>
          <Button
            className="h-9 w-full sm:w-auto gap-1.5"
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) setForm(emptyForm());
            }}
          >
            {showForm ? 'Cancel' : <><Plus className="size-4" /> Create Doubt Session</>}
          </Button>
        </div>

        {/* Unified Communications Hub Tabs */}
        <div className="flex items-center gap-2 border-b pb-2 text-xs sm:text-sm overflow-x-auto">
          <Link
            href="/admin/doubt-sessions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold bg-primary text-primary-foreground shadow-sm shrink-0"
          >
            <CalendarDays className="size-3.5" />
            Doubt Sessions ({slots.length})
          </Link>
          <Link
            href="/admin/notifications"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <Bell className="size-3.5" />
            Notifications & Broadcasts
          </Link>
          <Link
            href="/admin/queries"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <MessageSquare className="size-3.5" />
            Student Queries
          </Link>
        </div>
      </div>

      {/* ── CREATE FORM CARD ── */}
      {showForm && (
        <Card className="border-primary/40 shadow-lg">
          <CardHeader className="p-3 sm:p-5 pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              New Doubt Session Setup
            </CardTitle>
            <CardDescription className="text-xs">
              Configure session schedule, meeting link, and targeted audience.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0 space-y-4">
            {/* 1. Target Audience Selection */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Radio className="size-3.5 text-primary" />
                Target Audience & Access Control
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, target_type: 'all', course_id: '', student_id: '' }))}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all text-xs',
                    form.target_type === 'all'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30 font-semibold text-foreground'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                  )}
                >
                  <Users className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">All Active Students</p>
                    <p className="text-[10px] text-muted-foreground">Open to every student</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, target_type: 'course', student_id: '' }))}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all text-xs',
                    form.target_type === 'course'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30 font-semibold text-foreground'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                  )}
                >
                  <GraduationCap className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Enrolled Course</p>
                    <p className="text-[10px] text-muted-foreground">Course batch only</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, target_type: 'student', course_id: '' }))}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all text-xs',
                    form.target_type === 'student'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30 font-semibold text-foreground'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                  )}
                >
                  <User className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Specific Student</p>
                    <p className="text-[10px] text-muted-foreground">1-on-1 private slot</p>
                  </div>
                </button>
              </div>

              {/* Course Selection */}
              {form.target_type === 'course' && (
                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-xs">Choose Target Course</Label>
                  <Select
                    value={form.course_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, course_id: val }))}
                  >
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
              {form.target_type === 'student' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs">Search & Select Student</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search student by name or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-md border p-1 space-y-1 bg-background">
                    {filteredStudents.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">No matching students found.</p>
                    ) : (
                      filteredStudents.slice(0, 30).map((s) => {
                        const isSelected = form.student_id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, student_id: s.id }))}
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
                      <span>Target Student: <strong>{selectedStudent.full_name || 'Pilot'}</strong> ({selectedStudent.email})</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Slot Time & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  min={5}
                  max={180}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Max Bookings</Label>
                <Input
                  type="number"
                  value={form.max_bookings}
                  onChange={(e) => setForm((prev) => ({ ...prev, max_bookings: Number(e.target.value) }))}
                  min={1}
                  max={50}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* 3. Session Topic & Meeting Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Session Topic</Label>
                <Input
                  type="text"
                  placeholder="e.g. Navigation Systems Q&A / Chapter 3"
                  value={form.topic}
                  onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Meeting Link (Google Meet / Zoom)</Label>
                <Input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={form.meeting_link}
                  onChange={(e) => setForm((prev) => ({ ...prev, meeting_link: e.target.value }))}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* 4. Description */}
            <div>
              <Label className="text-xs">Description / Briefing Details (Optional)</Label>
              <Textarea
                placeholder="Optional instructions, preparation notes, or syllabus chapters covered..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="mt-1 text-xs sm:text-sm"
              />
            </div>

            {/* 5. Notification Dispatch Option */}
            <div className="flex items-center space-x-2 pt-1 border-t">
              <Checkbox
                id="notify-students"
                checked={form.notify_students}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, notify_students: checked === true }))
                }
              />
              <label
                htmlFor="notify-students"
                className="text-xs font-medium leading-none cursor-pointer flex items-center gap-1.5"
              >
                <Send className="size-3 text-primary" />
                Automatically send in-app notification to targeted students when saved
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-3"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 px-4 gap-1.5"
                onClick={handleCreate}
                disabled={loading || !form.date || !form.start_time || !form.end_time}
              >
                <Plus className="size-3.5" />
                {loading ? 'Saving & Notifying...' : 'Save & Schedule Session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SLOTS LIST ── */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground space-y-2">
          <CalendarDays className="size-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm font-medium">No doubt session slots created yet.</p>
          <p className="text-xs">Click "+ Create Doubt Session" above to schedule a session for all or targeted students.</p>
        </Card>
      ) : (
        Object.entries(grouped)
          .sort()
          .map(([date, dateSlots]) => (
            <div key={date} className="space-y-2.5">
              <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <CalendarDays className="size-3.5 text-primary" />
                {new Date(date + 'T00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="grid gap-2.5 sm:gap-3">
                {dateSlots.map((slot) => {
                  const targetBadge =
                    slot.target_type === 'course' ? (
                      <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <GraduationCap className="size-3" />
                        {slot.courses?.title ? `Course: ${slot.courses.title}` : 'Course Targeted'}
                      </Badge>
                    ) : slot.target_type === 'student' ? (
                      <Badge variant="outline" className="text-[10px] gap-1 bg-purple-500/10 text-purple-600 border-purple-500/30">
                        <User className="size-3" />
                        {slot.target_student?.full_name ? `1-on-1: ${slot.target_student.full_name}` : slot.target_student?.email ? `1-on-1: ${slot.target_student.email}` : '1-on-1 Private'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30">
                        <Users className="size-3" />
                        All Students
                      </Badge>
                    );

                  return (
                    <Card key={slot.id} className="p-3 sm:p-4">
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                            <span className="font-mono text-xs sm:text-sm font-semibold">
                              {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                            </span>
                            <span className="text-xs text-muted-foreground">({slot.duration_minutes}m)</span>
                            <Badge
                              variant={
                                slot.status === 'available'
                                  ? 'default'
                                  : slot.status === 'full'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="text-[10px]"
                            >
                              {slot.status}
                            </Badge>
                            {targetBadge}
                            <span className="text-xs text-muted-foreground font-medium">
                              {slot.current_bookings}/{slot.max_bookings} booked
                            </span>
                          </div>

                          {slot.topic && (
                            <p className="text-xs sm:text-sm font-semibold mt-1 text-foreground">{slot.topic}</p>
                          )}

                          {slot.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{slot.description}</p>
                          )}

                          {slot.meeting_link && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Video className="size-3 text-primary" />
                              <a
                                href={slot.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate max-w-sm"
                              >
                                {slot.meeting_link}
                                <ExternalLink className="size-2.5 shrink-0" />
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs"
                            onClick={() =>
                              editingSlotId === slot.id ? setEditingSlotId(null) : openEdit(slot)
                            }
                          >
                            {editingSlotId === slot.id ? 'Close' : 'Edit'}
                          </Button>
                          {slot.status === 'available' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs"
                              onClick={() => handleCancel(slot.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-2.5 text-xs"
                            onClick={() => handleDelete(slot.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* ── EDIT FORM INLINE ── */}
                      {editingSlotId === slot.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg border bg-muted/20">
                            <button
                              type="button"
                              onClick={() => setEditForm((prev) => ({ ...prev, target_type: 'all', course_id: '', student_id: '' }))}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded border text-left text-xs',
                                editForm.target_type === 'all'
                                  ? 'border-primary bg-primary/10 font-semibold'
                                  : 'border-border/60 text-muted-foreground',
                              )}
                            >
                              <Users className="size-3.5 text-primary" />
                              <span>All Students</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditForm((prev) => ({ ...prev, target_type: 'course', student_id: '' }))}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded border text-left text-xs',
                                editForm.target_type === 'course'
                                  ? 'border-primary bg-primary/10 font-semibold'
                                  : 'border-border/60 text-muted-foreground',
                              )}
                            >
                              <GraduationCap className="size-3.5 text-primary" />
                              <span>Enrolled Course</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditForm((prev) => ({ ...prev, target_type: 'student', course_id: '' }))}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded border text-left text-xs',
                                editForm.target_type === 'student'
                                  ? 'border-primary bg-primary/10 font-semibold'
                                  : 'border-border/60 text-muted-foreground',
                              )}
                            >
                              <User className="size-3.5 text-primary" />
                              <span>Specific Student</span>
                            </button>
                          </div>

                          {editForm.target_type === 'course' && (
                            <div>
                              <Label className="text-xs">Choose Target Course</Label>
                              <Select
                                value={editForm.course_id}
                                onValueChange={(val) => setEditForm((prev) => ({ ...prev, course_id: val }))}
                              >
                                <SelectTrigger className="h-8 text-xs mt-1">
                                  <SelectValue placeholder="Select course..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {courses.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                      {c.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {editForm.target_type === 'student' && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Select Target Student</Label>
                              <Input
                                placeholder="Filter student..."
                                value={editStudentSearch}
                                onChange={(e) => setEditStudentSearch(e.target.value)}
                                className="h-8 text-xs"
                              />
                              <div className="max-h-32 overflow-y-auto rounded border p-1 space-y-1 bg-background">
                                {filteredEditStudents.slice(0, 20).map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setEditForm((prev) => ({ ...prev, student_id: s.id }))}
                                    className={cn(
                                      'w-full flex items-center justify-between p-1.5 rounded text-left text-xs',
                                      editForm.student_id === s.id
                                        ? 'bg-primary text-primary-foreground font-medium'
                                        : 'hover:bg-muted text-foreground',
                                    )}
                                  >
                                    <span className="truncate">{s.full_name || 'Pilot'} ({s.email})</span>
                                    {editForm.student_id === s.id && <CheckCircle2 className="size-3 shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Date</Label>
                              <Input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Start Time</Label>
                              <Input
                                type="time"
                                value={editForm.start_time}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => {
                                    const updated = { ...prev, start_time: val };
                                    if (val && prev.duration_minutes > 0) {
                                      const startMins = timeToMinutes(val);
                                      updated.end_time = minutesToTime(startMins + prev.duration_minutes);
                                    }
                                    return updated;
                                  });
                                }}
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">End Time</Label>
                              <Input
                                type="time"
                                value={editForm.end_time}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm((prev) => {
                                    const updated = { ...prev, end_time: val };
                                    if (prev.start_time && val) {
                                      const diff = timeToMinutes(val) - timeToMinutes(prev.start_time);
                                      if (diff > 0) updated.duration_minutes = diff;
                                    }
                                    return updated;
                                  });
                                }}
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Duration (min)</Label>
                              <Input
                                type="number"
                                min={5}
                                max={180}
                                value={editForm.duration_minutes}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setEditForm((prev) => {
                                    const updated = { ...prev, duration_minutes: val };
                                    if (prev.start_time && val > 0) {
                                      updated.end_time = minutesToTime(timeToMinutes(prev.start_time) + val);
                                    }
                                    return updated;
                                  });
                                }}
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Max Bookings</Label>
                              <Input
                                type="number"
                                min={1}
                                max={50}
                                value={editForm.max_bookings}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, max_bookings: Number(e.target.value) }))
                                }
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Topic</Label>
                              <Input
                                value={editForm.topic}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, topic: e.target.value }))}
                                placeholder="Session topic"
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Meeting Link</Label>
                              <Input
                                type="url"
                                value={editForm.meeting_link}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, meeting_link: e.target.value }))
                                }
                                placeholder="https://meet.google.com/..."
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Description</Label>
                            <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="Optional description..."
                              rows={2}
                              className="mt-1 text-xs"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingSlotId(null)}>
                              Discard
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleEdit(slot.id)}
                              disabled={editLoading}
                            >
                              {editLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
