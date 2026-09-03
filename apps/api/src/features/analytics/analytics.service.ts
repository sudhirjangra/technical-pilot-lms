import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  // ---------------------------------------------------------------------------
  // GET /analytics/overview
  // ---------------------------------------------------------------------------
  async getOverview() {
    const [
      studentsRes,
      coursesRes,
      publishedCoursesRes,
      enrollmentsRes,
      activeEnrollmentsRes,
      completedEnrollmentsRes,
      paymentsRes,
      recentEnrollmentsRes,
      allEnrollmentsRes,
      publishedCoursesListRes,
      studentSignupsRes,
    ] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('is_active', true),
      this.supabase
        .from('courses')
        .select('id', { count: 'exact', head: true }),
      this.supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      this.supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true }),
      this.supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      this.supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      this.supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed'),
      this.supabase
        .from('enrollments')
        .select('id, enrolled_at, status, profiles(full_name, email), courses(title)')
        .order('enrolled_at', { ascending: false })
        .limit(30),
      // All enrollments for monthly grouping
      this.supabase
        .from('enrollments')
        .select('enrolled_at'),
      // Published courses for completion stats
      this.supabase
        .from('courses')
        .select('id, title')
        .eq('status', 'published'),
      // Student signups for monthly grouping (joining trend)
      this.supabase
        .from('profiles')
        .select('created_at')
        .eq('role', 'student'),
    ]);

    const totalRevenue = (paymentsRes.data ?? []).reduce(
      (sum: number, p: { amount: number }) => sum + (p.amount ?? 0),
      0,
    );

    // Group enrollments by month (last 12 months)
    const enrollmentsByMonth = this.groupByMonth(
      (allEnrollmentsRes.data ?? []).map((e: { enrolled_at: string }) => e.enrolled_at),
      12,
    );

    // Group student signups by month (last 12 months) to compare against enrollment trend
    const signupsByMonth = this.groupByMonth(
      (studentSignupsRes.data ?? []).map((p: { created_at: string }) => p.created_at),
      12,
    );

    const enrollmentTrend = enrollmentsByMonth.map((entry, index) => ({
      month: entry.month,
      enrollments: entry.count,
      signups: signupsByMonth[index]?.count ?? 0,
    }));

    // Course completion stats for each published course
    const publishedCourses = publishedCoursesListRes.data ?? [];
    const courseCompletionStats = await this.buildCourseCompletionStats(publishedCourses);

    return {
      totalStudents: studentsRes.count ?? 0,
      totalCourses: coursesRes.count ?? 0,
      publishedCourses: publishedCoursesRes.count ?? 0,
      totalEnrollments: enrollmentsRes.count ?? 0,
      activeEnrollments: activeEnrollmentsRes.count ?? 0,
      completedEnrollments: completedEnrollmentsRes.count ?? 0,
      totalRevenue,
      recentEnrollments: (recentEnrollmentsRes.data ?? []).map((e: any) => ({
        id: e.id,
        studentName: e.profiles?.full_name ?? 'Unknown',
        studentEmail: e.profiles?.email ?? '',
        courseTitle: e.courses?.title ?? 'Unknown',
        enrolledAt: e.enrolled_at,
        status: e.status,
      })),
      enrollmentsByMonth,
      signupsByMonth,
      enrollmentTrend,
      courseCompletionStats,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /analytics/courses/:courseId
  // ---------------------------------------------------------------------------
  async getCourseAnalytics(courseId: string) {
    const [courseRes, enrollmentsRes, chaptersRes] = await Promise.all([
      this.supabase
        .from('courses')
        .select('id, title, status, created_at, published_at')
        .eq('id', courseId)
        .single(),
      this.supabase
        .from('enrollments')
        .select('id, student_id, status, enrolled_at, profiles(id, full_name, email)')
        .eq('course_id', courseId),
      this.supabase
        .from('chapters')
        .select('id, title, sort_order, is_published, lessons(id, title, lesson_type, sort_order, is_published)')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true })
        .order('sort_order', { referencedTable: 'lessons', ascending: true }),
    ]);

    const course = courseRes.data;
    const enrollments = enrollmentsRes.data ?? [];
    const chapters = chaptersRes.data ?? [];

    const totalEnrolled = enrollments.length;
    const activeStudents = enrollments.filter((e: any) => e.status === 'active').length;
    const completedStudents = enrollments.filter((e: any) => e.status === 'completed').length;

    // Gather all lesson IDs
    const allLessons: { id: string; chapterId: string; title: string; lessonType: string }[] = [];
    for (const ch of chapters) {
      for (const l of (ch as any).lessons ?? []) {
        allLessons.push({
          id: l.id,
          chapterId: (ch as any).id,
          title: l.title,
          lessonType: l.lesson_type,
        });
      }
    }
    const lessonIds = allLessons.map((l) => l.id);
    const chapterIds = chapters.map((ch: any) => ch.id);
    const studentIds = enrollments.map((e: any) => e.student_id);

    // Query progress, chapter_starts for enrolled students
    const [progressRes, chapterStartsRes] = await Promise.all([
      lessonIds.length && studentIds.length
        ? this.supabase
            .from('progress')
            .select('student_id, lesson_id, status, progress_percent')
            .in('lesson_id', lessonIds)
            .in('student_id', studentIds)
        : Promise.resolve({ data: [] }),
      chapterIds.length && studentIds.length
        ? this.supabase
            .from('chapter_starts')
            .select('student_id, chapter_id, started_at')
            .in('chapter_id', chapterIds)
            .in('student_id', studentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const progressRows = (progressRes as any).data ?? [];

    // Build per-lesson stats
    const lessonStats = new Map<string, { completed: number; in_progress: number; not_started: number }>();
    for (const l of allLessons) {
      lessonStats.set(l.id, { completed: 0, in_progress: 0, not_started: 0 });
    }
    // Group progress by lesson
    const progressByLesson = new Map<string, any[]>();
    for (const p of progressRows) {
      const arr = progressByLesson.get(p.lesson_id) ?? [];
      arr.push(p);
      progressByLesson.set(p.lesson_id, arr);
    }
    for (const l of allLessons) {
      const stats = lessonStats.get(l.id)!;
      const tracked = new Set<string>();
      for (const p of progressByLesson.get(l.id) ?? []) {
        tracked.add(p.student_id);
        if (p.status === 'completed') stats.completed++;
        else if (p.status === 'in_progress') stats.in_progress++;
        else stats.not_started++;
      }
      // Students with no progress record at all count as not_started
      stats.not_started += studentIds.filter((sid: string) => !tracked.has(sid)).length;
    }

    // Enriched chapters with lesson stats
    const enrichedChapters = chapters.map((ch: any) => ({
      id: ch.id,
      title: ch.title,
      sortOrder: ch.sort_order,
      isPublished: ch.is_published,
      lessons: ((ch.lessons ?? []) as any[]).map((l: any) => ({
        id: l.id,
        title: l.title,
        lessonType: l.lesson_type,
        sortOrder: l.sort_order,
        isPublished: l.is_published,
        stats: lessonStats.get(l.id) ?? { completed: 0, in_progress: 0, not_started: totalEnrolled },
      })),
    }));

    // Per-chapter completion: a student "completes" a chapter only once every lesson in it is completed.
    const studentLessonStatus = new Map<string, Map<string, string>>();
    for (const p of progressRows) {
      const byLesson = studentLessonStatus.get(p.student_id) ?? new Map<string, string>();
      byLesson.set(p.lesson_id, p.status);
      studentLessonStatus.set(p.student_id, byLesson);
    }
    const chapterLessonIds = new Map<string, string[]>();
    for (const l of allLessons) {
      const existing = chapterLessonIds.get(l.chapterId) ?? [];
      existing.push(l.id);
      chapterLessonIds.set(l.chapterId, existing);
    }
    const chapterCompletionMap = new Map<string, number>();
    for (const chapterId of chapterIds) {
      const lessonsInChapter = chapterLessonIds.get(chapterId) ?? [];
      if (lessonsInChapter.length === 0) {
        chapterCompletionMap.set(chapterId, 0);
        continue;
      }
      const completedStudentsForChapter = studentIds.filter((sid: string) => {
        const byLesson = studentLessonStatus.get(sid);
        if (!byLesson) return false;
        return lessonsInChapter.every((lid) => byLesson.get(lid) === 'completed');
      }).length;
      chapterCompletionMap.set(chapterId, completedStudentsForChapter);
    }
    for (const chapter of enrichedChapters) {
      (chapter as any).studentsCompleted = chapterCompletionMap.get(chapter.id) ?? 0;
    }

    // Student rankings
    const studentRankings = await this.buildStudentRankings(enrollments, lessonIds, progressRows, allLessons);

    // Enrollment timeline
    const enrollmentTimeline = this.groupByMonth(
      enrollments.map((e: any) => e.enrolled_at),
      12,
    );

    return {
      course: course ?? null,
      totalEnrolled,
      activeStudents,
      completedStudents,
      chapters: enrichedChapters,
      studentRankings,
      enrollmentTimeline,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /analytics/courses/:courseId/students
  // ---------------------------------------------------------------------------
  async getCourseStudents(courseId: string) {
    const { data: enrollments } = await this.supabase
      .from('enrollments')
      .select('id, student_id, enrolled_at, status, profiles(id, full_name, email)')
      .eq('course_id', courseId);

    if (!enrollments || enrollments.length === 0) return [];

    // Get all lessons for this course
    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('id, lessons(id)')
      .eq('course_id', courseId);

    const lessonIds = (chapters ?? []).flatMap((ch: any) =>
      ((ch.lessons ?? []) as any[]).map((l: any) => l.id),
    );
    const totalLessons = lessonIds.length;

    const studentIds = enrollments.map((e: any) => e.student_id);

    const { data: progressRows } = lessonIds.length && studentIds.length
      ? await this.supabase
          .from('progress')
          .select('student_id, lesson_id, status, progress_percent, updated_at')
          .in('lesson_id', lessonIds)
          .in('student_id', studentIds)
      : { data: [] };

    // Group progress by student
    const progressByStudent = new Map<string, any[]>();
    for (const p of progressRows ?? []) {
      const arr = progressByStudent.get(p.student_id) ?? [];
      arr.push(p);
      progressByStudent.set(p.student_id, arr);
    }

    return enrollments.map((e: any) => {
      const studentProgress = progressByStudent.get(e.student_id) ?? [];
      const lessonsCompleted = studentProgress.filter((p: any) => p.status === 'completed').length;
      const overallProgress = totalLessons > 0
        ? Math.round(
            studentProgress.reduce(
              (sum: number, p: any) =>
                sum +
                (p.status === 'completed'
                  ? 100
                  : Math.min(100, Math.max(0, p.progress_percent ?? 0))),
              0,
            ) / totalLessons,
          )
        : 0;
      const lastActivity = studentProgress.length
        ? studentProgress.reduce((latest: string | null, p: any) => {
            if (!latest || (p.updated_at && p.updated_at > latest)) return p.updated_at;
            return latest;
          }, null as string | null)
        : null;

      return {
        id: e.student_id,
        fullName: (e.profiles as any)?.full_name ?? 'Unknown',
        email: (e.profiles as any)?.email ?? '',
        enrolledAt: e.enrolled_at,
        status: e.status,
        overallProgress,
        lessonsCompleted,
        totalLessons,
        lastActivity,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // GET /analytics/courses/:courseId/chapters/:chapterId
  // ---------------------------------------------------------------------------
  async getChapterAnalytics(courseId: string, chapterId: string) {
    const [chapterRes, enrollmentsRes] = await Promise.all([
      this.supabase
        .from('chapters')
        .select('id, title, sort_order, is_published, lessons(id, title, lesson_type, sort_order, is_published)')
        .eq('id', chapterId)
        .eq('course_id', courseId)
        .order('sort_order', { referencedTable: 'lessons', ascending: true })
        .single(),
      this.supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId),
    ]);

    const chapter = chapterRes.data as any;
    if (!chapter) return { chapter: null, lessons: [] };

    const lessons = (chapter.lessons ?? []) as any[];
    const lessonIds = lessons.map((l: any) => l.id);
    const studentIds = (enrollmentsRes.data ?? []).map((e: any) => e.student_id);
    const totalStudents = studentIds.length;

    // Get progress for all lessons
    const { data: progressRows } = lessonIds.length && studentIds.length
      ? await this.supabase
          .from('progress')
          .select('student_id, lesson_id, status, progress_percent')
          .in('lesson_id', lessonIds)
          .in('student_id', studentIds)
      : { data: [] };

    // Group progress by lesson
    const progressByLesson = new Map<string, any[]>();
    for (const p of progressRows ?? []) {
      const arr = progressByLesson.get(p.lesson_id) ?? [];
      arr.push(p);
      progressByLesson.set(p.lesson_id, arr);
    }

    // For test/assignment lessons, get attempt stats
    const testLessonIds = lessons.filter((l: any) => l.lesson_type === 'test').map((l: any) => l.id);
    const assignmentLessonIds = lessons.filter((l: any) => l.lesson_type === 'assignment').map((l: any) => l.id);

    const [testsRes, assignmentsRes] = await Promise.all([
      testLessonIds.length
        ? this.supabase
            .from('tests')
            .select('id, lesson_id, passing_score_percent, test_attempts(id, score, max_score)')
            .in('lesson_id', testLessonIds)
        : Promise.resolve({ data: [] }),
      assignmentLessonIds.length
        ? this.supabase
            .from('assignments')
            .select('id, lesson_id, passing_score_percent, assignment_attempts(id, score, max_score)')
            .in('lesson_id', assignmentLessonIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Build test/assignment stats by lesson_id
    const attemptStatsByLesson = new Map<string, { totalAttempts: number; avgScore: number; passRate: number }>();

    for (const test of (testsRes as any).data ?? []) {
      const attempts = test.test_attempts ?? [];
      const passingScore = test.passing_score_percent ?? 0;
      const totalAttempts = attempts.length;
      const avgScore = totalAttempts > 0
        ? Math.round(
            attempts.reduce((sum: number, a: any) => {
              const pct = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0;
              return sum + pct;
            }, 0) / totalAttempts,
          )
        : 0;
      const passCount = attempts.filter((a: any) => {
        const pct = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0;
        return pct >= passingScore;
      }).length;
      const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;
      attemptStatsByLesson.set(test.lesson_id, { totalAttempts, avgScore, passRate });
    }

    for (const assignment of (assignmentsRes as any).data ?? []) {
      const attempts = assignment.assignment_attempts ?? [];
      const passingScore = assignment.passing_score_percent ?? 0;
      const totalAttempts = attempts.length;
      const avgScore = totalAttempts > 0
        ? Math.round(
            attempts.reduce((sum: number, a: any) => {
              const pct = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0;
              return sum + pct;
            }, 0) / totalAttempts,
          )
        : 0;
      const passCount = attempts.filter((a: any) => {
        const pct = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0;
        return pct >= passingScore;
      }).length;
      const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;
      attemptStatsByLesson.set(assignment.lesson_id, { totalAttempts, avgScore, passRate });
    }

    const enrichedLessons = lessons.map((l: any) => {
      const progressForLesson = progressByLesson.get(l.id) ?? [];
      const tracked = new Set(progressForLesson.map((p: any) => p.student_id));
      const completedCount = progressForLesson.filter((p: any) => p.status === 'completed').length;
      const inProgressCount = progressForLesson.filter((p: any) => p.status === 'in_progress').length;
      const notStartedCount = totalStudents - tracked.size + progressForLesson.filter((p: any) => p.status === 'not_started').length;
      const avgProgress = progressForLesson.length > 0
        ? Math.round(
            progressForLesson.reduce(
              (sum: number, p: any) =>
                sum +
                (p.status === 'completed'
                  ? 100
                  : Math.min(100, Math.max(0, p.progress_percent ?? 0))),
              0,
            ) / progressForLesson.length,
          )
        : 0;

      const result: any = {
        id: l.id,
        title: l.title,
        lessonType: l.lesson_type,
        sortOrder: l.sort_order,
        isPublished: l.is_published,
        completedCount,
        inProgressCount,
        notStartedCount,
        avgProgress,
      };

      const attemptStats = attemptStatsByLesson.get(l.id);
      if (attemptStats) {
        result.attemptStats = attemptStats;
      }

      return result;
    });

    return {
      chapter: {
        id: chapter.id,
        title: chapter.title,
        sortOrder: chapter.sort_order,
        isPublished: chapter.is_published,
      },
      lessons: enrichedLessons,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /analytics/students/:studentId
  // ---------------------------------------------------------------------------
  async getStudentDetail(studentId: string) {
    const [profileRes, devicesRes, enrollmentsRes, recentProgressRes] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('id, email, role, full_name, phone, avatar_url, is_active, date_of_birth, created_at, updated_at')
        .eq('id', studentId)
        .single(),
      this.supabase
        .from('devices')
        .select('id, device_name, platform, last_active_at, created_at')
        .eq('user_id', studentId)
        .order('last_active_at', { ascending: false }),
      this.supabase
        .from('enrollments')
        .select('id, course_id, enrolled_at, status, completed_at, courses(id, title)')
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false }),
      this.supabase
        .from('progress')
        .select('lesson_id, status, progress_percent, completed_at, updated_at, lessons(id, title, chapters(id, title, courses(id, title)))')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false })
        .limit(20),
    ]);

    const profile = profileRes.data;
    const devices = devicesRes.data ?? [];
    const enrollments = enrollmentsRes.data ?? [];
    const recentActivity = recentProgressRes.data ?? [];

    // Calculate per-enrollment progress
    const courseIds = enrollments.map((e: any) => e.course_id);
    let allCourseProgress: any[] = [];
    if (courseIds.length) {
      // Get all lessons per course
      const { data: chapters } = await this.supabase
        .from('chapters')
        .select('id, course_id, lessons(id)')
        .in('course_id', courseIds);

      // lessons by course
      const lessonsByCourse = new Map<string, string[]>();
      for (const ch of chapters ?? []) {
        const cid = (ch as any).course_id;
        const existing = lessonsByCourse.get(cid) ?? [];
        for (const l of ((ch as any).lessons ?? []) as any[]) {
          existing.push(l.id);
        }
        lessonsByCourse.set(cid, existing);
      }

      const allLessonIds = Array.from(lessonsByCourse.values()).flat();
      const { data: progressRows } = allLessonIds.length
        ? await this.supabase
            .from('progress')
            .select('lesson_id, status, progress_percent')
            .eq('student_id', studentId)
            .in('lesson_id', allLessonIds)
        : { data: [] };

      const progressMap = new Map<string, any>();
      for (const p of progressRows ?? []) {
        progressMap.set(p.lesson_id, p);
      }

      allCourseProgress = enrollments.map((e: any) => {
        const courseLessons = lessonsByCourse.get(e.course_id) ?? [];
        const totalLessons = courseLessons.length;
        let lessonsCompleted = 0;
        let progressSum = 0;
        for (const lid of courseLessons) {
          const p = progressMap.get(lid);
          if (p) {
            if (p.status === 'completed') {
              lessonsCompleted++;
              progressSum += 100;
            } else {
              progressSum += Math.min(100, Math.max(0, p.progress_percent ?? 0));
            }
          }
        }
        const overallProgress = totalLessons > 0 ? Math.round(progressSum / totalLessons) : 0;
        return {
          enrollmentId: e.id,
          courseId: e.course_id,
          courseTitle: (e.courses as any)?.title ?? 'Unknown',
          enrolledAt: e.enrolled_at,
          status: e.status,
          completedAt: e.completed_at,
          overallProgress,
          lessonsCompleted,
          totalLessons,
        };
      });
    }

    // Get attempt stats for summary
    const [testAttemptsRes, assignmentAttemptsRes] = await Promise.all([
      this.supabase
        .from('test_attempts')
        .select('id, time_spent_seconds')
        .eq('student_id', studentId),
      this.supabase
        .from('assignment_attempts')
        .select('id, time_spent_seconds')
        .eq('student_id', studentId),
    ]);

    const testAttempts = testAttemptsRes.data ?? [];
    const assignmentAttempts = assignmentAttemptsRes.data ?? [];

    const totalCoursesEnrolled = enrollments.length;
    const completedCourses = enrollments.filter((e: any) => e.status === 'completed').length;
    const totalLessonsCompleted = allCourseProgress.reduce(
      (sum: number, cp: any) => sum + cp.lessonsCompleted,
      0,
    );
    const totalTimeOnTests = testAttempts.reduce(
      (sum: number, a: any) => sum + (a.time_spent_seconds ?? 0),
      0,
    );
    const totalTimeOnAssignments = assignmentAttempts.reduce(
      (sum: number, a: any) => sum + (a.time_spent_seconds ?? 0),
      0,
    );

    return {
      profile: profile ?? null,
      devices,
      enrollments: allCourseProgress,
      recentActivity: recentActivity.map((p: any) => ({
        lessonId: p.lesson_id,
        lessonTitle: p.lessons?.title ?? 'Unknown',
        chapterTitle: p.lessons?.chapters?.title ?? 'Unknown',
        courseTitle: p.lessons?.chapters?.courses?.title ?? 'Unknown',
        status: p.status,
        progressPercent: p.progress_percent,
        completedAt: p.completed_at,
        updatedAt: p.updated_at,
      })),
      summary: {
        totalCoursesEnrolled,
        completedCourses,
        totalLessonsCompleted,
        totalTestAttempts: testAttempts.length,
        totalAssignmentAttempts: assignmentAttempts.length,
        totalTimeOnTestsSeconds: totalTimeOnTests,
        totalTimeOnAssignmentsSeconds: totalTimeOnAssignments,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // GET /analytics/students/:studentId/attempts
  // ---------------------------------------------------------------------------
  async getStudentAttempts(studentId: string) {
    const [testAttemptsRes, assignmentAttemptsRes] = await Promise.all([
      this.supabase
        .from('test_attempts')
        .select('id, test_id, started_at, completed_at, score, max_score, time_spent_seconds, tests(id, title, passing_score_percent, lessons(id, title))')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false }),
      this.supabase
        .from('assignment_attempts')
        .select('id, assignment_id, started_at, completed_at, score, max_score, time_spent_seconds, assignments(id, title, passing_score_percent, lessons(id, title))')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false }),
    ]);

    const testAttempts = (testAttemptsRes.data ?? []).map((a: any) => {
      const percentage = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
      const passingScore = a.tests?.passing_score_percent ?? 0;
      return {
        id: a.id,
        type: 'test' as const,
        title: a.tests?.title ?? 'Unknown',
        lessonTitle: a.tests?.lessons?.title ?? 'Unknown',
        startedAt: a.started_at,
        completedAt: a.completed_at,
        score: a.score,
        maxScore: a.max_score,
        percentage,
        passed: percentage >= passingScore,
        timeSpentSeconds: a.time_spent_seconds,
      };
    });

    const assignmentAttempts = (assignmentAttemptsRes.data ?? []).map((a: any) => {
      const percentage = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
      const passingScore = a.assignments?.passing_score_percent ?? 0;
      return {
        id: a.id,
        type: 'assignment' as const,
        title: a.assignments?.title ?? 'Unknown',
        lessonTitle: a.assignments?.lessons?.title ?? 'Unknown',
        startedAt: a.started_at,
        completedAt: a.completed_at,
        score: a.score,
        maxScore: a.max_score,
        percentage,
        passed: percentage >= passingScore,
        timeSpentSeconds: a.time_spent_seconds,
      };
    });

    // Merge and sort by startedAt desc
    const allAttempts = [...testAttempts, ...assignmentAttempts].sort((a, b) => {
      const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return dateB - dateA;
    });

    return allAttempts;
  }

  // ---------------------------------------------------------------------------
  // GET /analytics/students/:studentId/courses/:courseId
  // ---------------------------------------------------------------------------
  async getStudentCourseDetail(studentId: string, courseId: string) {
    const [courseRes, enrollmentRes, chaptersRes] = await Promise.all([
      this.supabase
        .from('courses')
        .select('id, title, status, created_at, published_at')
        .eq('id', courseId)
        .single(),
      this.supabase
        .from('enrollments')
        .select('id, enrolled_at, status, completed_at')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .maybeSingle(),
      this.supabase
        .from('chapters')
        .select('id, title, sort_order, is_published, lessons(id, title, lesson_type, sort_order, is_published)')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true })
        .order('sort_order', { referencedTable: 'lessons', ascending: true }),
    ]);

    const course = courseRes.data;
    const enrollment = enrollmentRes.data;
    const chapters = chaptersRes.data ?? [];

    // Get all lesson IDs
    const allLessons: { id: string; chapterId: string; lessonType: string }[] = [];
    for (const ch of chapters as any[]) {
      for (const l of ch.lessons ?? []) {
        allLessons.push({ id: l.id, chapterId: ch.id, lessonType: l.lesson_type });
      }
    }
    const lessonIds = allLessons.map((l) => l.id);

    // Get progress for all lessons
    const { data: progressRows } = lessonIds.length
      ? await this.supabase
          .from('progress')
          .select('lesson_id, status, progress_percent, last_position_seconds, completed_at, updated_at')
          .eq('student_id', studentId)
          .in('lesson_id', lessonIds)
      : { data: [] };

    const progressMap = new Map<string, any>();
    for (const p of progressRows ?? []) {
      progressMap.set(p.lesson_id, p);
    }

    // Get test/assignment attempts for test/assignment lessons
    const testLessonIds = allLessons.filter((l) => l.lessonType === 'test').map((l) => l.id);
    const assignmentLessonIds = allLessons.filter((l) => l.lessonType === 'assignment').map((l) => l.id);

    const [testsRes, assignmentsRes] = await Promise.all([
      testLessonIds.length
        ? this.supabase
            .from('tests')
            .select('id, lesson_id, title, passing_score_percent, test_attempts(id, started_at, completed_at, score, max_score, time_spent_seconds)')
            .in('lesson_id', testLessonIds)
            .eq('test_attempts.student_id', studentId)
        : Promise.resolve({ data: [] }),
      assignmentLessonIds.length
        ? this.supabase
            .from('assignments')
            .select('id, lesson_id, title, passing_score_percent, assignment_attempts(id, started_at, completed_at, score, max_score, time_spent_seconds)')
            .in('lesson_id', assignmentLessonIds)
            .eq('assignment_attempts.student_id', studentId)
        : Promise.resolve({ data: [] }),
    ]);

    // Map attempts by lesson_id
    const attemptsByLesson = new Map<string, any[]>();
    for (const test of (testsRes as any).data ?? []) {
      const attempts = (test.test_attempts ?? []).map((a: any) => ({
        id: a.id,
        type: 'test',
        startedAt: a.started_at,
        completedAt: a.completed_at,
        score: a.score,
        maxScore: a.max_score,
        percentage: a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0,
        passed: a.max_score > 0
          ? (a.score / a.max_score) * 100 >= (test.passing_score_percent ?? 0)
          : false,
        timeSpentSeconds: a.time_spent_seconds,
      }));
      attemptsByLesson.set(test.lesson_id, attempts);
    }
    for (const assignment of (assignmentsRes as any).data ?? []) {
      const attempts = (assignment.assignment_attempts ?? []).map((a: any) => ({
        id: a.id,
        type: 'assignment',
        startedAt: a.started_at,
        completedAt: a.completed_at,
        score: a.score,
        maxScore: a.max_score,
        percentage: a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0,
        passed: a.max_score > 0
          ? (a.score / a.max_score) * 100 >= (assignment.passing_score_percent ?? 0)
          : false,
        timeSpentSeconds: a.time_spent_seconds,
      }));
      attemptsByLesson.set(assignment.lesson_id, attempts);
    }

    // Build enriched chapters
    const enrichedChapters = (chapters as any[]).map((ch) => ({
      id: ch.id,
      title: ch.title,
      sortOrder: ch.sort_order,
      isPublished: ch.is_published,
      lessons: ((ch.lessons ?? []) as any[]).map((l: any) => {
        const progress = progressMap.get(l.id) ?? null;
        const attempts = attemptsByLesson.get(l.id) ?? [];
        return {
          id: l.id,
          title: l.title,
          lessonType: l.lesson_type,
          sortOrder: l.sort_order,
          isPublished: l.is_published,
          progress: progress
            ? {
                status: progress.status,
                progressPercent: progress.progress_percent,
                lastPositionSeconds: progress.last_position_seconds,
                completedAt: progress.completed_at,
                updatedAt: progress.updated_at,
              }
            : null,
          ...(attempts.length > 0 ? { attempts } : {}),
        };
      }),
    }));

    // Overall stats
    const totalLessons = lessonIds.length;
    const lessonsCompleted = (progressRows ?? []).filter((p: any) => p.status === 'completed').length;
    const overallProgress = totalLessons > 0
      ? Math.round(
          (progressRows ?? []).reduce(
            (sum: number, p: any) =>
              sum +
              (p.status === 'completed'
                ? 100
                : Math.min(100, Math.max(0, p.progress_percent ?? 0))),
            0,
          ) / totalLessons,
        )
      : 0;

    return {
      course: course ?? null,
      enrollment: enrollment ?? null,
      chapters: enrichedChapters,
      stats: {
        totalLessons,
        lessonsCompleted,
        overallProgress,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Helper: group dates by month (returns array of { month, count })
  // ---------------------------------------------------------------------------
  private groupByMonth(dates: (string | null)[], monthsBack: number) {
    const now = new Date();
    const months: { month: string; count: number }[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, count: 0 });
    }

    const monthMap = new Map(months.map((m) => [m.month, m]));

    for (const dateStr of dates) {
      if (!dateStr) continue;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) entry.count++;
    }

    return months;
  }

  // ---------------------------------------------------------------------------
  // Helper: build course completion stats for overview
  // ---------------------------------------------------------------------------
  private async buildCourseCompletionStats(
    courses: { id: string; title: string }[],
  ) {
    if (courses.length === 0) return [];

    const courseIds = courses.map((c) => c.id);

    const { data: enrollments } = await this.supabase
      .from('enrollments')
      .select('course_id, student_id, status')
      .in('course_id', courseIds);

    // For each course, count enrolled and completed, and track enrolled student ids
    const enrollmentsByCourse = new Map<string, { enrolled: number; completed: number; studentIds: string[] }>();
    for (const cid of courseIds) {
      enrollmentsByCourse.set(cid, { enrolled: 0, completed: 0, studentIds: [] });
    }
    for (const e of enrollments ?? []) {
      const stats = enrollmentsByCourse.get((e as any).course_id);
      if (stats) {
        stats.enrolled++;
        stats.studentIds.push((e as any).student_id);
        if ((e as any).status === 'completed') stats.completed++;
      }
    }

    // Get all chapters+lessons per course for avg progress
    const { data: chapters } = await this.supabase
      .from('chapters')
      .select('id, course_id, lessons(id)')
      .in('course_id', courseIds);

    const lessonsByCourse = new Map<string, string[]>();
    for (const ch of (chapters ?? []) as any[]) {
      const existing = lessonsByCourse.get(ch.course_id) ?? [];
      for (const l of ch.lessons ?? []) {
        existing.push(l.id);
      }
      lessonsByCourse.set(ch.course_id, existing);
    }

    const allLessonIds = Array.from(lessonsByCourse.values()).flat();

    const { data: progressRows } = allLessonIds.length
      ? await this.supabase
          .from('progress')
          .select('lesson_id, student_id, progress_percent, status')
          .in('lesson_id', allLessonIds)
      : { data: [] };

    // Progress percent by lesson, keyed by student. Assignment/test lessons never carry a
    // percentage, so a completed status is what actually marks them as 100%.
    const progressByLessonAndStudent = new Map<string, Map<string, number>>();
    for (const p of (progressRows ?? []) as any[]) {
      const byStudent = progressByLessonAndStudent.get(p.lesson_id) ?? new Map<string, number>();
      const percent =
        p.status === 'completed'
          ? 100
          : Math.min(100, Math.max(0, p.progress_percent ?? 0));
      byStudent.set(p.student_id, percent);
      progressByLessonAndStudent.set(p.lesson_id, byStudent);
    }

    return courses.map((c) => {
      const stats = enrollmentsByCourse.get(c.id) ?? { enrolled: 0, completed: 0, studentIds: [] };
      const courseLessons = lessonsByCourse.get(c.id) ?? [];
      let avgProgress = 0;
      if (courseLessons.length > 0 && stats.enrolled > 0) {
        // Average each enrolled student's overall course progress (missing lesson progress counts as 0%),
        // then average those per-student percentages across all enrolled students.
        const totalAcrossStudents = stats.studentIds.reduce((sum, studentId) => {
          const studentTotal = courseLessons.reduce((lessonSum, lessonId) => {
            const percent = progressByLessonAndStudent.get(lessonId)?.get(studentId) ?? 0;
            return lessonSum + percent;
          }, 0);
          return sum + studentTotal / courseLessons.length;
        }, 0);
        avgProgress = Math.round(totalAcrossStudents / stats.enrolled);
      }
      return {
        courseId: c.id,
        title: c.title,
        enrolled: stats.enrolled,
        completed: stats.completed,
        avgProgress,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Helper: build student rankings for course analytics
  // ---------------------------------------------------------------------------
  private async buildStudentRankings(
    enrollments: any[],
    lessonIds: string[],
    progressRows: any[],
    allLessons: { id: string; chapterId: string; title: string; lessonType: string }[],
  ) {
    if (enrollments.length === 0) return [];

    const studentIds = enrollments.map((e: any) => e.student_id);
    const totalLessons = allLessons.length;

    // Group progress by student
    const progressByStudent = new Map<string, any[]>();
    for (const p of progressRows) {
      const arr = progressByStudent.get(p.student_id) ?? [];
      arr.push(p);
      progressByStudent.set(p.student_id, arr);
    }

    // Get test/assignment lesson IDs
    const testLessonIds = allLessons.filter((l) => l.lessonType === 'test').map((l) => l.id);
    const assignmentLessonIds = allLessons.filter((l) => l.lessonType === 'assignment').map((l) => l.id);

    // Fetch tests & assignments with attempts for these students
    const [testsRes, assignmentsRes] = await Promise.all([
      testLessonIds.length && studentIds.length
        ? this.supabase
            .from('tests')
            .select('id, lesson_id, test_attempts(student_id, score, max_score)')
            .in('lesson_id', testLessonIds)
            .in('test_attempts.student_id', studentIds)
        : Promise.resolve({ data: [] }),
      assignmentLessonIds.length && studentIds.length
        ? this.supabase
            .from('assignments')
            .select('id, lesson_id, assignment_attempts(student_id, score, max_score)')
            .in('lesson_id', assignmentLessonIds)
            .in('assignment_attempts.student_id', studentIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Best test score per student
    const bestTestScore = new Map<string, number>();
    for (const test of (testsRes as any).data ?? []) {
      for (const a of test.test_attempts ?? []) {
        const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
        const existing = bestTestScore.get(a.student_id) ?? 0;
        if (pct > existing) bestTestScore.set(a.student_id, pct);
      }
    }

    // Best assignment score per student
    const bestAssignmentScore = new Map<string, number>();
    for (const assignment of (assignmentsRes as any).data ?? []) {
      for (const a of assignment.assignment_attempts ?? []) {
        const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
        const existing = bestAssignmentScore.get(a.student_id) ?? 0;
        if (pct > existing) bestAssignmentScore.set(a.student_id, pct);
      }
    }

    const rankings = enrollments.map((e: any) => {
      const studentProgress = progressByStudent.get(e.student_id) ?? [];
      const progressSum = studentProgress.reduce(
        (sum: number, p: any) => sum + (p.progress_percent ?? 0),
        0,
      );
      const overallProgress = totalLessons > 0 ? Math.round(progressSum / totalLessons) : 0;

      return {
        studentId: e.student_id,
        fullName: (e.profiles as any)?.full_name ?? 'Unknown',
        email: (e.profiles as any)?.email ?? '',
        enrollmentStatus: e.status,
        overallProgress,
        bestTestScore: bestTestScore.get(e.student_id) ?? null,
        bestAssignmentScore: bestAssignmentScore.get(e.student_id) ?? null,
      };
    });

    // Sort by progress desc
    rankings.sort((a, b) => b.overallProgress - a.overallProgress);

    return rankings;
  }
}
