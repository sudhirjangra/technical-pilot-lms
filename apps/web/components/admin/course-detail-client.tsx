'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CourseDetail, updateCourse } from '@/server/admin/course-detail.server';
import { Chapter, createChapter, deleteChapter, createLesson, deleteLesson } from '@/server/admin/chapters.server';
import { Enrollment } from '@/server/admin/enrollments.server';
import { createVideoLesson, updateVideoLesson, VideoLesson } from '@/server/admin/videos.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import { toast } from '@repo/shadcn/sonner';

export function CourseDetailClient({
  course,
  chapters,
  enrollments,
  videoLessons = [],
}: {
  course: CourseDetail;
  chapters: Chapter[];
  enrollments: Enrollment[];
  videoLessons?: VideoLesson[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [lessonFormChapterId, setLessonFormChapterId] = useState<string | null>(null);
  const [videoFormLessonId, setVideoFormLessonId] = useState<string | null>(null);

  const videoLessonMap = new Map(videoLessons.map((v) => [v.lesson_id, v]));

  const handleSaveVideoId = async (e: React.FormEvent<HTMLFormElement>, lessonId: string) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const vdocipherId = (fd.get('vdocipher_video_id') as string).trim();
    const duration = fd.get('duration_seconds') ? Number(fd.get('duration_seconds')) : undefined;

    const existing = videoLessonMap.get(lessonId);
    const result = existing
      ? await updateVideoLesson(lessonId, { vdocipher_video_id: vdocipherId, duration_seconds: duration })
      : await createVideoLesson({ lesson_id: lessonId, vdocipher_video_id: vdocipherId, duration_seconds: duration });

    setLoading(false);
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to save video ID');
    } else {
      toast.success('Video ID saved');
      setVideoFormLessonId(null);
      router.refresh();
    }
  };

  const handleStatusChange = async (status: string) => {
    setLoading(true);
    const result = await updateCourse(course.id, { status });
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Status changed to ${status}`);
      router.refresh();
    }
  };

  const handleAddChapter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createChapter({
      course_id: course.id,
      title: fd.get('title') as string,
      description: fd.get('description') as string || undefined,
      is_published: true,
    });
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Chapter added');
      setShowChapterForm(false);
      router.refresh();
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Delete this chapter and all its lessons?')) return;
    const result = await deleteChapter(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Chapter deleted');
      router.refresh();
    }
  };

  const handleAddLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createLesson({
      chapter_id: lessonFormChapterId!,
      title: fd.get('title') as string,
      description: fd.get('description') as string || undefined,
      lesson_type: fd.get('lesson_type') as string,
      is_published: true,
      duration_seconds: fd.get('duration') ? Number(fd.get('duration')) : undefined,
    });
    setLoading(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Lesson added');
      setLessonFormChapterId(null);
      router.refresh();
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    const result = await deleteLesson(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Lesson deleted');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/courses" className="text-muted-foreground hover:underline text-sm">
          ← Courses
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            /{course.slug} • ₹{course.price}
            {course.discount_price ? ` → ₹${course.discount_price}` : ''}
            {course.categories ? ` • ${course.categories.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
            {course.status}
          </Badge>
          {course.status === 'draft' && (
            <Button size="sm" onClick={() => handleStatusChange('published')} disabled={loading}>
              Publish
            </Button>
          )}
          {course.status === 'published' && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('archived')} disabled={loading}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {course.description && (
        <p className="text-muted-foreground">{course.description}</p>
      )}

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content ({chapters.length} chapters)</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowChapterForm(!showChapterForm)}>
              {showChapterForm ? 'Cancel' : '+ Add Chapter'}
            </Button>
          </div>

          {showChapterForm && (
            <Card className="p-4">
              <form onSubmit={handleAddChapter} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Title</label>
                  <input name="title" required className="w-full border rounded px-3 py-2 mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Description</label>
                  <input name="description" className="w-full border rounded px-3 py-2 mt-1" />
                </div>
                <Button type="submit" disabled={loading}>Add</Button>
              </form>
            </Card>
          )}

          {chapters.length === 0 && <p className="text-muted-foreground">No chapters yet.</p>}

          {chapters.map((chapter, idx) => (
            <Card key={chapter.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {idx + 1}. {chapter.title}
                    {!chapter.is_published && (
                      <Badge variant="outline" className="ml-2">Draft</Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLessonFormChapterId(
                        lessonFormChapterId === chapter.id ? null : chapter.id,
                      )}
                    >
                      + Lesson
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteChapter(chapter.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessonFormChapterId === chapter.id && (
                  <form onSubmit={handleAddLesson} className="flex gap-3 items-end border-b pb-3 mb-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium">Title</label>
                      <input name="title" required className="w-full border rounded px-3 py-2 mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <select name="lesson_type" required className="w-full border rounded px-3 py-2 mt-1">
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="assignment">Assignment</option>
                        <option value="test">Test</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-sm font-medium">Duration (s)</label>
                      <input name="duration" type="number" className="w-full border rounded px-3 py-2 mt-1" />
                    </div>
                    <Button type="submit" disabled={loading} size="sm">Add</Button>
                  </form>
                )}

                {chapter.lessons && chapter.lessons.length > 0 ? (
                  chapter.lessons.map((lesson, li) => {
                    const vl = videoLessonMap.get(lesson.id);
                    return (
                      <div key={lesson.id} className="rounded border border-transparent hover:border-muted">
                        <div className="flex items-center justify-between py-2 px-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-6">{li + 1}.</span>
                            <span className="text-sm">{lesson.title}</span>
                            <Badge variant="outline" className="text-xs">{lesson.lesson_type}</Badge>
                            {lesson.duration_seconds && (
                              <span className="text-xs text-muted-foreground">
                                {Math.floor(lesson.duration_seconds / 60)}m
                              </span>
                            )}
                            {lesson.lesson_type === 'video' && (
                              vl ? (
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {vl.vdocipher_video_id.slice(0, 12)}…
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
                                  No video linked
                                </Badge>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {lesson.lesson_type === 'video' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setVideoFormLessonId(
                                  videoFormLessonId === lesson.id ? null : lesson.id,
                                )}
                              >
                                {vl ? 'Edit Video' : 'Link Video'}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteLesson(lesson.id)}>
                              ✕
                            </Button>
                          </div>
                        </div>

                        {lesson.lesson_type === 'video' && videoFormLessonId === lesson.id && (
                          <form
                            onSubmit={(e) => handleSaveVideoId(e, lesson.id)}
                            className="flex gap-3 items-end px-3 pb-3"
                          >
                            <div className="flex-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                VdoCipher Video ID
                              </label>
                              <input
                                name="vdocipher_video_id"
                                required
                                defaultValue={vl?.vdocipher_video_id ?? ''}
                                placeholder="e.g. abc123def456"
                                className="w-full border rounded px-3 py-1.5 mt-1 text-sm font-mono"
                              />
                            </div>
                            <div className="w-28">
                              <label className="text-xs font-medium text-muted-foreground">
                                Duration (sec)
                              </label>
                              <input
                                name="duration_seconds"
                                type="number"
                                defaultValue={vl?.duration_seconds ?? ''}
                                placeholder="3600"
                                className="w-full border rounded px-3 py-1.5 mt-1 text-sm"
                              />
                            </div>
                            <Button type="submit" size="sm" disabled={loading}>Save</Button>
                          </form>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground px-3">No lessons yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          {enrollments.length === 0 ? (
            <p className="text-muted-foreground">No enrollments yet.</p>
          ) : (
            <div className="grid gap-3">
              {enrollments.map((en) => (
                <Card key={en.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{en.profiles?.full_name ?? en.profiles?.email ?? en.student_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Enrolled: {new Date(en.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={en.status === 'active' ? 'default' : 'secondary'}>{en.status}</Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
