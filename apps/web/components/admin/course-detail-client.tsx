'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createAssignment,
  createAssignmentQuestion,
  deleteAssignmentQuestion,
  getAssignmentForLesson,
  importAssignmentQuestions,
  reorderAssignmentQuestions,
  updateAssignment,
  updateAssignmentQuestion,
} from '@/server/admin/assignments.server';
import {
  Chapter,
  createChapter,
  createLesson,
  deleteChapter,
  deleteLesson,
  deletePdfLesson,
  reorderChapters,
  reorderLessons,
  updateChapter,
  updateLesson,
  uploadPdfLesson,
} from '@/server/admin/chapters.server';
import { CourseDetail, updateCourse } from '@/server/admin/course-detail.server';
import { Enrollment } from '@/server/admin/enrollments.server';
import {
  createTest,
  createTestQuestion,
  deleteTestQuestion,
  getTestForLesson,
  importTestQuestions,
  reorderTestQuestions,
  updateTest,
  updateTestQuestion,
} from '@/server/admin/tests.server';
import {
  deleteVideoLesson,
  uploadVideoLesson,
  VideoLesson,
} from '@/server/admin/videos.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Checkbox } from '@repo/shadcn/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { OrbitalSpinner } from '@repo/shadcn/orbital-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { toast } from '@repo/shadcn/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import { Textarea } from '@repo/shadcn/textarea';

type LessonKind = 'video' | 'pdf' | 'assignment' | 'test';
type BuilderKind = 'assignment' | 'test';
type QuestionType = 'mcq' | 'msq' | 'text';

type BuilderQuestionOption = {
  id: string;
  question_id?: string | null;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
};

type BuilderQuestion = {
  id: string;
  question_number: number | null;
  question_text: string;
  question_type: QuestionType;
  points: number;
  explanation: string | null | undefined;
  topic: string | null | undefined;
  correct_text_answer: string | null | undefined;
  sort_order: number;
  question_options: BuilderQuestionOption[];
};

type BuilderMetaDraft = {
  title: string;
  timeLimitMinutes: string;
  passingScorePercent: string;
  maxAttempts: string;
  instructions: string;
  dueDaysAfterStart: string;
  maxScore: string;
};

type QuestionOptionDraft = {
  option_text: string;
  is_correct: boolean;
};

type QuestionDraft = {
  question_number: string;
  question_text: string;
  question_type: QuestionType;
  points: string;
  explanation: string;
  topic: string;
  correct_text_answer: string;
  options: QuestionOptionDraft[];
};

type BuilderLesson = {
  id: string;
  title: string;
  lesson_type: BuilderKind;
};

const defaultBuilderMeta = (lessonTitle = ''): BuilderMetaDraft => ({
  title: lessonTitle,
  timeLimitMinutes: '',
  passingScorePercent: '',
  maxAttempts: '',
  instructions: '',
  dueDaysAfterStart: '',
  maxScore: '100',
});

const createOptionDraft = (isCorrect = false): QuestionOptionDraft => ({
  option_text: '',
  is_correct: isCorrect,
});

const createQuestionDraft = (questionType: QuestionType = 'mcq'): QuestionDraft => ({
  question_number: '',
  question_text: '',
  question_type: questionType,
  points: '1',
  explanation: '',
  topic: '',
  correct_text_answer: '',
  options: questionType === 'text'
    ? []
    : [createOptionDraft(true), createOptionDraft(false)],
});

const sortQuestions = (questions: BuilderQuestion[]) => (
  [...questions].sort((left, right) => left.sort_order - right.sort_order)
);

const moveItem = <T,>(items: T[], index: number, direction: -1 | 1) => {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return null;
  const reordered = [...items];
  const currentItem = reordered[index];
  const nextItem = reordered[nextIndex];
  if (currentItem === undefined || nextItem === undefined) return null;
  reordered[index] = nextItem;
  reordered[nextIndex] = currentItem;
  return reordered;
};

const buildReorderPayload = <T extends { id: string }>(items: T[]) => (
  items.map((item, index) => ({ id: item.id, sort_order: index + 1 }))
);

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseOptionalMinutesToSeconds = (value: string) => {
  const minutes = parseOptionalNumber(value);
  return typeof minutes === 'number' ? Math.round(minutes * 60) : undefined;
};

const isBuilderLesson = (lessonType: string): lessonType is BuilderKind => (
  lessonType === 'assignment' || lessonType === 'test'
);

const getMetaFromEntity = (
  lessonTitle: string,
  kind: BuilderKind,
  entity:
    | {
      title: string;
      time_limit_seconds?: number | null;
      passing_score_percent?: number | null;
      max_attempts?: number | null;
      instructions?: string | null;
      due_days_after_start?: number | null;
      max_score?: number | null;
    }
    | null,
): BuilderMetaDraft => ({
  title: entity?.title ?? lessonTitle,
  timeLimitMinutes: entity?.time_limit_seconds ? String(entity.time_limit_seconds / 60) : '',
  passingScorePercent: entity?.passing_score_percent != null ? String(entity.passing_score_percent) : '',
  maxAttempts: entity?.max_attempts != null ? String(entity.max_attempts) : '',
  instructions: kind === 'assignment' ? entity?.instructions ?? '' : '',
  dueDaysAfterStart:
    kind === 'assignment' && entity?.due_days_after_start != null
      ? String(entity.due_days_after_start)
      : '',
  maxScore:
    kind === 'assignment' && entity?.max_score != null
      ? String(entity.max_score)
      : '100',
});

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
  const [pdfFormLessonId, setPdfFormLessonId] = useState<string | null>(null);
  const [newLessonType, setNewLessonType] = useState<LessonKind>('video');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [activeBuilderLesson, setActiveBuilderLesson] = useState<BuilderLesson | null>(null);
  const [builderRecordId, setBuilderRecordId] = useState<string | null>(null);
  const [builderMeta, setBuilderMeta] = useState<BuilderMetaDraft>(defaultBuilderMeta());
  const [builderQuestions, setBuilderQuestions] = useState<BuilderQuestion[]>([]);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(createQuestionDraft());
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null);

  const videoLessonMap = new Map(
    videoLessons.map((videoLesson) => [videoLesson.lesson_id, videoLesson]),
  );

  const resetQuestionEditor = () => {
    setQuestionDraft(createQuestionDraft());
    setEditingQuestionId(null);
    setShowQuestionForm(false);
  };

  const handleUploadVideo = async (
    event: React.FormEvent<HTMLFormElement>,
    lessonId: string,
  ) => {
    event.preventDefault();
    setUploadingLessonId(lessonId);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const file = formData.get('video');
    const result = file instanceof File && file.size > 0
      ? await uploadVideoLesson(lessonId, file)
      : { error: 'Please select a video file' };

    setLoading(false);
    setUploadingLessonId(null);
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to upload video');
      return;
    }

    toast.success('Video uploaded');
    setVideoFormLessonId(null);
    router.refresh();
  };

  const handleUploadPdf = async (
    event: React.FormEvent<HTMLFormElement>,
    lessonId: string,
  ) => {
    event.preventDefault();
    setUploadingLessonId(lessonId);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const file = formData.get('pdf');
    const result = file instanceof File && file.size > 0
      ? await uploadPdfLesson(lessonId, file)
      : { error: 'Please select a PDF file' };

    setLoading(false);
    setUploadingLessonId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('PDF uploaded');
    setPdfFormLessonId(null);
    router.refresh();
  };

  const handleDeleteVideo = async (lessonId: string) => {
    if (!confirm('Delete the linked video for this lesson?')) return;
    setLoading(true);
    const result = await deleteVideoLesson(lessonId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Video deleted');
    router.refresh();
  };

  const handleDeletePdf = async (lessonId: string) => {
    if (!confirm('Delete the PDF for this lesson?')) return;
    setLoading(true);
    const result = await deletePdfLesson(lessonId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('PDF deleted');
    router.refresh();
  };

  const handleStatusChange = async (status: string) => {
    setLoading(true);
    try {
      const result = await updateCourse(course.id, { status });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status changed to ${status}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const result = await createChapter({
      course_id: course.id,
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? '') || undefined,
      is_published: true,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Chapter added');
    setShowChapterForm(false);
    router.refresh();
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Delete this chapter and all its lessons?')) return;
    const result = await deleteChapter(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Chapter deleted');
    router.refresh();
  };

  const handleAddLesson = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lessonFormChapterId) return;

    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const lessonType = String(formData.get('lesson_type') ?? 'video') as LessonKind;
    const result = await createLesson({
      chapter_id: lessonFormChapterId,
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? '') || undefined,
      lesson_type: lessonType,
      is_published: true,
    });

    if (result.error || !result.data) {
      setLoading(false);
      toast.error(result.error ?? 'Failed to create lesson');
      return;
    }
    const createdLesson = result.data;

    const file = formData.get('asset');
    const uploadResult: { error?: string } = file instanceof File && file.size > 0
      ? lessonType === 'video'
        ? await uploadVideoLesson(createdLesson.id, file)
        : lessonType === 'pdf'
          ? await uploadPdfLesson(createdLesson.id, file)
          : {}
      : {};

    setLoading(false);
    if (uploadResult.error) {
      toast.error(uploadResult.error);
    } else {
      toast.success('Lesson added');
    }
    setLessonFormChapterId(null);
    router.refresh();
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    const result = await deleteLesson(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Lesson deleted');
    router.refresh();
  };

  const handleChapterReorder = async (chapterIndex: number, direction: -1 | 1) => {
    const reordered = moveItem(chapters, chapterIndex, direction);
    if (!reordered) return;
    setLoading(true);
    const result = await reorderChapters(buildReorderPayload(reordered));
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Chapter order updated');
    router.refresh();
  };

  const handleLessonReorder = async (
    chapter: Chapter,
    lessonIndex: number,
    direction: -1 | 1,
  ) => {
    const lessons = chapter.lessons ?? [];
    const reordered = moveItem(lessons, lessonIndex, direction);
    if (!reordered) return;
    setLoading(true);
    const result = await reorderLessons(buildReorderPayload(reordered));
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Lesson order updated');
    router.refresh();
  };

  const handleToggleChapterPublished = async (chapter: Chapter) => {
    setLoading(true);
    const result = await updateChapter(chapter.id, {
      is_published: !chapter.is_published,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Chapter ${chapter.is_published ? 'unpublished' : 'published'}`);
    router.refresh();
  };

  const handleToggleLessonPublished = async (
    lesson: NonNullable<Chapter['lessons']>[number],
  ) => {
    setLoading(true);
    const result = await updateLesson(lesson.id, {
      is_published: !lesson.is_published,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Lesson ${lesson.is_published ? 'unpublished' : 'published'}`);
    router.refresh();
  };

  const openQuestionManager = async (lesson: BuilderLesson) => {
    setBuilderOpen(true);
    setBuilderLoading(true);
    setBuilderSaving(false);
    setActiveBuilderLesson(lesson);
    setBuilderRecordId(null);
    setBuilderMeta(defaultBuilderMeta(lesson.title));
    setBuilderQuestions([]);
    resetQuestionEditor();
    setImportFile(null);

    const entity = lesson.lesson_type === 'test'
      ? await getTestForLesson(lesson.id)
      : await getAssignmentForLesson(lesson.id);

    setBuilderLoading(false);
    if (!entity) {
      setBuilderMeta(defaultBuilderMeta(lesson.title));
      return;
    }

    setBuilderRecordId(entity.id);
    setBuilderMeta(getMetaFromEntity(lesson.title, lesson.lesson_type, entity));
    setBuilderQuestions(sortQuestions(entity.questions.map((question) => ({
      id: question.id,
      question_number: question.question_number ?? null,
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      explanation: question.explanation,
      topic: (question as { topic?: string | null }).topic ?? null,
      correct_text_answer: (question as { correct_text_answer?: string | null }).correct_text_answer ?? null,
      sort_order: question.sort_order,
      question_options: [...question.question_options].sort(
        (left, right) => left.sort_order - right.sort_order,
      ),
    }))));
  };

  const closeQuestionManager = (open: boolean) => {
    setBuilderOpen(open);
    if (open) return;
    setActiveBuilderLesson(null);
    setBuilderRecordId(null);
    setBuilderQuestions([]);
    setBuilderMeta(defaultBuilderMeta());
    setImportFile(null);
    resetQuestionEditor();
  };

  const handleBuilderMetaChange = (field: keyof BuilderMetaDraft, value: string) => {
    setBuilderMeta((current) => ({ ...current, [field]: value }));
  };

  const handleSaveBuilderMeta = async () => {
    if (!activeBuilderLesson) return;
    const title = builderMeta.title.trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }

    setBuilderSaving(true);

    const commonPayload = {
      title,
      time_limit_seconds: parseOptionalMinutesToSeconds(builderMeta.timeLimitMinutes),
      passing_score_percent: parseOptionalNumber(builderMeta.passingScorePercent),
      max_attempts: parseOptionalNumber(builderMeta.maxAttempts),
    };

    const result = activeBuilderLesson.lesson_type === 'test'
      ? builderRecordId
        ? await updateTest(builderRecordId, commonPayload)
        : await createTest({ lesson_id: activeBuilderLesson.id, ...commonPayload })
      : builderRecordId
        ? await updateAssignment(builderRecordId, {
          ...commonPayload,
          instructions: builderMeta.instructions.trim() || undefined,
          due_days_after_start: parseOptionalNumber(builderMeta.dueDaysAfterStart),
          max_score: parseOptionalNumber(builderMeta.maxScore),
        })
        : await createAssignment({
          lesson_id: activeBuilderLesson.id,
          ...commonPayload,
          instructions: builderMeta.instructions.trim() || undefined,
          due_days_after_start: parseOptionalNumber(builderMeta.dueDaysAfterStart),
          max_score: parseOptionalNumber(builderMeta.maxScore),
        });

    setBuilderSaving(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? 'Failed to save details');
      return;
    }
    const savedRecord = result.data;

    setBuilderRecordId(savedRecord.id);
    toast.success(
      `${activeBuilderLesson.lesson_type === 'test' ? 'Test' : 'Assignment'} details saved`,
    );
  };

  const startEditingQuestion = (question?: BuilderQuestion) => {
    if (!question) {
      setQuestionDraft(createQuestionDraft());
      setEditingQuestionId(null);
      setShowQuestionForm(true);
      return;
    }

    setQuestionDraft({
      question_number: question.question_number != null ? String(question.question_number) : '',
      question_text: question.question_text,
      question_type: question.question_type,
      points: String(question.points),
      explanation: question.explanation ?? '',
      topic: question.topic ?? '',
      correct_text_answer: question.correct_text_answer ?? '',
      options: question.question_type === 'text'
        ? []
        : question.question_options.map((option) => ({
          option_text: option.option_text,
          is_correct: option.is_correct,
        })),
    });
    setEditingQuestionId(question.id);
    setShowQuestionForm(true);
  };

  const handleQuestionDraftChange = (field: keyof QuestionDraft, value: string) => {
    setQuestionDraft((current) => ({ ...current, [field]: value }));
  };

  const handleQuestionTypeChange = (questionType: QuestionType) => {
    setQuestionDraft((current) => ({
      ...current,
      question_type: questionType,
      options: questionType === 'text'
        ? []
        : current.options.length >= 2
          ? current.options
          : [createOptionDraft(true), createOptionDraft(false)],
    }));
  };

  const handleOptionTextChange = (index: number, value: string) => {
    setQuestionDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (
        optionIndex === index ? { ...option, option_text: value } : option
      )),
    }));
  };

  const handleOptionCorrectChange = (index: number, checked: boolean) => {
    setQuestionDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => {
        if (current.question_type === 'mcq') {
          return {
            ...option,
            is_correct: optionIndex === index ? checked : false,
          };
        }

        if (optionIndex !== index) return option;
        return { ...option, is_correct: checked };
      }),
    }));
  };

  const addOptionRow = () => {
    setQuestionDraft((current) => ({
      ...current,
      options: [...current.options, createOptionDraft(false)],
    }));
  };

  const removeOptionRow = (index: number) => {
    setQuestionDraft((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  };

  const handleSaveQuestion = async () => {
    if (!activeBuilderLesson || !builderRecordId) {
      toast.error('Save the assignment/test details first');
      return;
    }

    const questionText = questionDraft.question_text.trim();
    if (!questionText) {
      toast.error('Question text is required');
      return;
    }

    const points = Number(questionDraft.points);
    if (!Number.isFinite(points) || points <= 0) {
      toast.error('Points must be greater than 0');
      return;
    }

    const questionNumber = parseOptionalNumber(questionDraft.question_number);
    if (questionDraft.question_number.trim() && questionNumber == null) {
      toast.error('Question number must be a valid positive integer');
      return;
    }

    const isTextQuestion = questionDraft.question_type === 'text';
    const preparedOptions = isTextQuestion
      ? undefined
      : questionDraft.options.map((option) => ({
        option_text: option.option_text.trim(),
        is_correct: option.is_correct,
      }));

    if (!isTextQuestion) {
      if (!preparedOptions || preparedOptions.length < 2) {
        toast.error('Add at least 2 options');
        return;
      }
      if (preparedOptions.some((option) => !option.option_text)) {
        toast.error('Option text is required');
        return;
      }
      const correctCount = preparedOptions.filter((option) => option.is_correct).length;
      if (questionDraft.question_type === 'mcq' && correctCount !== 1) {
        toast.error('MCQ must have exactly 1 correct option');
        return;
      }
      if (questionDraft.question_type === 'msq' && correctCount < 1) {
        toast.error('MSQ must have at least 1 correct option');
        return;
      }
    }

    setBuilderSaving(true);
    const payload = {
      question_number: questionNumber,
      question_text: questionText,
      question_type: questionDraft.question_type,
      points,
      explanation: questionDraft.explanation.trim() || undefined,
      topic: questionDraft.topic.trim() || undefined,
      correct_text_answer: questionDraft.question_type === 'text'
        ? questionDraft.correct_text_answer.trim() || undefined
        : undefined,
      options: preparedOptions,
    };

    const result = activeBuilderLesson.lesson_type === 'test'
      ? editingQuestionId
        ? await updateTestQuestion(editingQuestionId, payload)
        : await createTestQuestion(builderRecordId, payload)
      : editingQuestionId
        ? await updateAssignmentQuestion(editingQuestionId, payload)
        : await createAssignmentQuestion(builderRecordId, payload);

    setBuilderSaving(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? 'Failed to save question');
      return;
    }
    const savedQuestion = result.data;

    setBuilderQuestions((current) => sortQuestions([
      ...current.filter((question) => question.id !== savedQuestion.id),
      {
        id: savedQuestion.id,
        question_number: savedQuestion.question_number ?? null,
        question_text: savedQuestion.question_text,
        question_type: savedQuestion.question_type,
        points: savedQuestion.points,
        explanation: savedQuestion.explanation,
        topic: savedQuestion.topic ?? null,
        correct_text_answer: (savedQuestion as { correct_text_answer?: string | null }).correct_text_answer ?? null,
        sort_order: savedQuestion.sort_order,
        question_options: [...savedQuestion.question_options].sort(
          (left, right) => left.sort_order - right.sort_order,
        ),
      },
    ]));
    toast.success(`Question ${editingQuestionId ? 'updated' : 'added'}`);
    resetQuestionEditor();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeBuilderLesson) return;
    if (!confirm('Delete this question?')) return;

    setBuilderSaving(true);
    const result = activeBuilderLesson.lesson_type === 'test'
      ? await deleteTestQuestion(questionId)
      : await deleteAssignmentQuestion(questionId);
    setBuilderSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setBuilderQuestions((current) => current.filter((question) => question.id !== questionId));
    toast.success('Question deleted');
  };

  const handleImportQuestions = async () => {
    if (!activeBuilderLesson || !builderRecordId) {
      toast.error('Save the assignment/test details first');
      return;
    }
    if (!importFile) {
      toast.error('Select a file to import');
      return;
    }
    if (!confirm('Importing will append these questions below the existing ones. Continue?')) return;

    setBuilderSaving(true);
    const result = activeBuilderLesson.lesson_type === 'test'
      ? await importTestQuestions(builderRecordId, importFile)
      : await importAssignmentQuestions(builderRecordId, importFile);
    setBuilderSaving(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? 'Failed to import questions');
      return;
    }
    const importedQuestions = result.data.questions;
    const importedCount = result.data.count;

    setBuilderQuestions((current) => sortQuestions([
      ...current,
      ...importedQuestions.map((question) => ({
        id: question.id,
        question_number: question.question_number ?? null,
        question_text: question.question_text,
        question_type: question.question_type,
        points: question.points,
        explanation: question.explanation,
        topic: (question as { topic?: string | null }).topic ?? null,
        correct_text_answer: (question as { correct_text_answer?: string | null }).correct_text_answer ?? null,
        sort_order: question.sort_order,
        question_options: [...question.question_options].sort(
          (left, right) => left.sort_order - right.sort_order,
        ),
      })),
    ]));
    toast.success(`Imported ${importedCount} question${importedCount === 1 ? '' : 's'}`);
    setImportFile(null);
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card/95 px-6 py-5 shadow-lg">
            <OrbitalSpinner className="size-12" />
            <p className="text-sm font-medium text-foreground">Please wait...</p>
            <p className="text-xs text-muted-foreground">Your request is being processed.</p>
          </div>
        </div>
      )}

      <Dialog open={builderOpen} onOpenChange={closeQuestionManager}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,1600px)] max-w-[96vw] overflow-y-auto p-4 sm:p-6 md:max-w-[90vw] lg:max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px]">
          <DialogHeader>
            <DialogTitle>
              {activeBuilderLesson?.lesson_type === 'test' ? 'Manage Test' : 'Manage Assignment'} Questions
            </DialogTitle>
            <DialogDescription>
              Save details first, then add, edit, reorder, or import questions.
            </DialogDescription>
          </DialogHeader>

          {builderLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <OrbitalSpinner className="size-10" />
              <p className="text-sm text-muted-foreground">Loading builder...</p>
            </div>
          ) : activeBuilderLesson ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={builderMeta.title}
                        onChange={(event) => handleBuilderMetaChange('title', event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Time limit (minutes)</label>
                      <Input
                        inputMode="decimal"
                        value={builderMeta.timeLimitMinutes}
                        onChange={(event) => handleBuilderMetaChange('timeLimitMinutes', event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Passing score %</label>
                      <Input
                        inputMode="numeric"
                        value={builderMeta.passingScorePercent}
                        onChange={(event) => handleBuilderMetaChange('passingScorePercent', event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max attempts</label>
                      <Input
                        inputMode="numeric"
                        value={builderMeta.maxAttempts}
                        onChange={(event) => handleBuilderMetaChange('maxAttempts', event.target.value)}
                      />
                    </div>
                    {activeBuilderLesson.lesson_type === 'assignment' && (
                      <>
                        <div>
                          <label className="text-sm font-medium">Due days after start</label>
                          <Input
                            inputMode="numeric"
                            value={builderMeta.dueDaysAfterStart}
                            onChange={(event) => handleBuilderMetaChange('dueDaysAfterStart', event.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Max score</label>
                          <Input
                            inputMode="numeric"
                            value={builderMeta.maxScore}
                            onChange={(event) => handleBuilderMetaChange('maxScore', event.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">Instructions</label>
                          <Textarea
                            value={builderMeta.instructions}
                            onChange={(event) => handleBuilderMetaChange('instructions', event.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleSaveBuilderMeta} disabled={builderSaving}>
                      {builderSaving ? (
                        <>
                          <OrbitalSpinner className="mr-2 size-3" />
                          Saving...
                        </>
                      ) : (
                        'Save Details'
                      )}
                    </Button>
                    {!builderRecordId && (
                      <p className="text-xs text-muted-foreground">
                        Save details once before adding or importing questions.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Bulk Import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <a className="underline underline-offset-4" href="/templates/question-import-template.csv" download>
                      Download CSV template
                    </a>
                    <a className="underline underline-offset-4" href="/templates/question-import-template.json" download>
                      Download JSON template
                    </a>
                    <a className="underline underline-offset-4" href="/templates/question-import-template.xlsx" download>
                      Download Excel template
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Imported questions are appended after the current list for this {activeBuilderLesson.lesson_type}.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium">Import file</label>
                      <Input
                        type="file"
                        accept=".csv,.json,.xlsx"
                        onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                      />
                    </div>
                    <Button size="sm" onClick={handleImportQuestions} disabled={builderSaving || !importFile}>
                      {builderSaving ? (
                        <>
                          <OrbitalSpinner className="mr-2 size-3" />
                          Importing...
                        </>
                      ) : (
                        'Import'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">Questions ({builderQuestions.length})</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => startEditingQuestion()}>
                      + Add Question
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showQuestionForm && (
                    <div className="rounded-lg border p-3 sm:p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Question number</label>
                          <Input
                            inputMode="numeric"
                            value={questionDraft.question_number}
                            onChange={(event) => handleQuestionDraftChange('question_number', event.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Question type</label>
                          <Select
                            value={questionDraft.question_type}
                            onValueChange={(value) => handleQuestionTypeChange(value as QuestionType)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq">MCQ</SelectItem>
                              <SelectItem value="msq">MSQ</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">Question text</label>
                          <Textarea
                            value={questionDraft.question_text}
                            onChange={(event) => handleQuestionDraftChange('question_text', event.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Points</label>
                          <Input
                            inputMode="numeric"
                            value={questionDraft.points}
                            onChange={(event) => handleQuestionDraftChange('points', event.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">Explanation (optional)</label>
                          <Textarea
                            value={questionDraft.explanation}
                            onChange={(event) => handleQuestionDraftChange('explanation', event.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Topic / Subject <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <Input
                            value={questionDraft.topic}
                            onChange={(event) => handleQuestionDraftChange('topic', event.target.value)}
                            placeholder="e.g. Algebra, Chemistry, History"
                          />
                        </div>
                        {questionDraft.question_type === 'text' && (
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium">
                              Expected answer{' '}
                              <span className="text-muted-foreground font-normal">(case-insensitive match — leave blank for manual grading)</span>
                            </label>
                            <Input
                              value={questionDraft.correct_text_answer}
                              onChange={(event) => handleQuestionDraftChange('correct_text_answer', event.target.value)}
                              placeholder="e.g. photosynthesis"
                            />
                          </div>
                        )}
                      </div>

                      {questionDraft.question_type !== 'text' && (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">Options</p>
                            <Button size="sm" variant="ghost" onClick={addOptionRow}>
                              + Option
                            </Button>
                          </div>
                          {questionDraft.options.map((option, optionIndex) => (
                            <div
                              key={`${editingQuestionId ?? 'new'}-${optionIndex}`}
                              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
                            >
                              <Input
                                value={option.option_text}
                                onChange={(event) => handleOptionTextChange(optionIndex, event.target.value)}
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={option.is_correct}
                                  onCheckedChange={(checked) => handleOptionCorrectChange(optionIndex, checked === true)}
                                />
                                Correct
                              </label>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeOptionRow(optionIndex)}
                                disabled={questionDraft.options.length <= 2}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={handleSaveQuestion} disabled={builderSaving}>
                          {builderSaving ? (
                            <>
                              <OrbitalSpinner className="mr-2 size-3" />
                              Saving...
                            </>
                          ) : editingQuestionId ? (
                            'Save Question'
                          ) : (
                            'Add Question'
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetQuestionEditor}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {builderQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {builderQuestions.map((question, questionIndex) => (
                        <div key={question.id} className="rounded-lg border p-3 sm:p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  {question.question_number ?? questionIndex + 1}. {question.question_text}
                                </span>
                                <Badge variant="outline">{question.question_type.toUpperCase()}</Badge>
                                <Badge variant="secondary">{question.points} pt{question.points === 1 ? '' : 's'}</Badge>
                                {question.topic && (
                                  <Badge variant="outline" className="text-[10px]">{question.topic}</Badge>
                                )}
                              </div>
                              {question.question_options.length > 0 && (
                                <div className="space-y-1">
                                  {question.question_options.map((option) => (
                                    <div key={option.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                                      <span
                                        className={`mt-0.5 inline-flex size-4 items-center justify-center border text-[10px] ${question.question_type === 'mcq' ? 'rounded-full' : 'rounded-sm'}`}
                                      >
                                        {option.is_correct ? '✓' : ''}
                                      </span>
                                      <span>{option.option_text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {question.explanation && (
                                <details className="text-xs text-muted-foreground">
                                  <summary className="cursor-pointer">Explanation</summary>
                                  <p className="mt-1 whitespace-pre-wrap">{question.explanation}</p>
                                </details>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEditingQuestion(question)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteQuestion(question.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3">
        <Link href="/admin/courses" className="text-muted-foreground text-sm hover:underline">
          ← Courses
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            /{course.slug} • ₹{course.price}
            {course.discount_price ? ` → ₹${course.discount_price}` : ''}
            {course.categories ? ` • ${course.categories.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block size-2.5 rounded-full ${
              course.status === 'published'
                ? 'bg-emerald-500'
                : course.status === 'archived'
                  ? 'bg-slate-500'
                  : 'bg-amber-500'
            }`}
            title={course.status}
            aria-label={course.status}
          />
          {course.status !== 'published' && (
            <Button size="sm" onClick={() => handleStatusChange('published')} disabled={loading}>
              Publish
            </Button>
          )}
          {course.status !== 'draft' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('draft')}
              disabled={loading}
            >
              Move to Draft
            </Button>
          )}
          {course.status !== 'archived' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('archived')}
              disabled={loading}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {course.description && (
        <p className="text-muted-foreground">{course.description}</p>
      )}

      <Tabs defaultValue="content">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="content">Content ({chapters.length} chapters)</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowChapterForm(!showChapterForm)}>
              {showChapterForm ? 'Cancel' : '+ Add Chapter'}
            </Button>
          </div>

          {showChapterForm && (
            <Card className="p-4">
              <form onSubmit={handleAddChapter} className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Title</label>
                  <Input name="title" required className="mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Description</label>
                  <Input name="description" className="mt-1" />
                </div>
                <Button type="submit" disabled={loading}>Add</Button>
              </form>
            </Card>
          )}

          {chapters.length === 0 && <p className="text-muted-foreground">No chapters yet.</p>}

          {chapters.map((chapter, chapterIndex) => (
            <Card key={chapter.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {chapterIndex + 1}. {chapter.title}
                    </CardTitle>
                    <span
                      className={`inline-block size-2.5 rounded-full ${
                        chapter.is_published ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      title={chapter.is_published ? 'Published' : 'Draft'}
                      aria-label={chapter.is_published ? 'Published' : 'Draft'}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={chapterIndex === 0 || loading}
                      onClick={() => handleChapterReorder(chapterIndex, -1)}
                    >
                      ▲
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={chapterIndex === chapters.length - 1 || loading}
                      onClick={() => handleChapterReorder(chapterIndex, 1)}
                    >
                      ▼
                    </Button>
                    <Button
                      size="sm"
                      variant={chapter.is_published ? 'outline' : 'default'}
                      onClick={() => handleToggleChapterPublished(chapter)}
                      disabled={loading}
                    >
                      {chapter.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
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
                  <form onSubmit={handleAddLesson} className="mb-3 flex flex-col gap-3 border-b pb-3 md:flex-row md:items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium">Title</label>
                      <Input name="title" required className="mt-1" />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium">Description</label>
                      <Input name="description" className="mt-1" />
                    </div>
                    <div className="w-full md:w-44">
                      <label className="text-sm font-medium">Type</label>
                      <select
                        name="lesson_type"
                        required
                        value={newLessonType}
                        onChange={(event) => setNewLessonType(event.target.value as LessonKind)}
                        className="border-input mt-1 h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                      >
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="assignment">Assignment</option>
                        <option value="test">Test</option>
                      </select>
                    </div>
                    {(newLessonType === 'video' || newLessonType === 'pdf') && (
                      <div className="w-full md:w-52">
                        <label className="text-sm font-medium">Asset</label>
                        <Input
                          name="asset"
                          type="file"
                          accept={newLessonType === 'video' ? 'video/*' : 'application/pdf,.pdf'}
                          className="mt-1 text-xs"
                        />
                      </div>
                    )}
                    <Button type="submit" disabled={loading} size="sm">Add</Button>
                  </form>
                )}

                {chapter.lessons && chapter.lessons.length > 0 ? (
                  chapter.lessons.map((lesson, lessonIndex) => {
                    const videoLesson = videoLessonMap.get(lesson.id);
                    return (
                      <div key={lesson.id} className="rounded border border-transparent p-3 hover:border-muted">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-xs text-muted-foreground">{lessonIndex + 1}.</span>
                            <span>{lesson.title}</span>
                            <Badge variant="outline" className="text-xs">{lesson.lesson_type}</Badge>
                            <span
                              className={`inline-block size-2.5 rounded-full ${
                                lesson.is_published ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              title={lesson.is_published ? 'Published' : 'Draft'}
                              aria-label={lesson.is_published ? 'Published' : 'Draft'}
                            />
                            {lesson.duration_seconds ? (
                              <span className="text-xs text-muted-foreground">
                                {Math.floor(lesson.duration_seconds / 60)}m
                              </span>
                            ) : null}
                            {lesson.lesson_type === 'video' && (
                              videoLesson ? (
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {videoLesson.vdocipher_video_id.slice(0, 12)}…
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-yellow-400 text-xs text-yellow-600">
                                  No video linked
                                </Badge>
                              )
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={lessonIndex === 0 || loading}
                              onClick={() => handleLessonReorder(chapter, lessonIndex, -1)}
                            >
                              ▲
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={lessonIndex === (chapter.lessons?.length ?? 0) - 1 || loading}
                              onClick={() => handleLessonReorder(chapter, lessonIndex, 1)}
                            >
                              ▼
                            </Button>
                            <Button
                              size="sm"
                              variant={lesson.is_published ? 'outline' : 'default'}
                              onClick={() => handleToggleLessonPublished(lesson)}
                              disabled={loading}
                            >
                              {lesson.is_published ? 'Unpublish' : 'Publish'}
                            </Button>
                            {lesson.lesson_type === 'video' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setVideoFormLessonId(
                                    videoFormLessonId === lesson.id ? null : lesson.id,
                                  )}
                                >
                                  {videoLesson ? 'Replace Video' : 'Upload Video'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteVideo(lesson.id)}
                                >
                                  Delete Video
                                </Button>
                              </>
                            )}
                            {lesson.lesson_type === 'pdf' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPdfFormLessonId(
                                    pdfFormLessonId === lesson.id ? null : lesson.id,
                                  )}
                                >
                                  Replace PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeletePdf(lesson.id)}
                                >
                                  Delete PDF
                                </Button>
                              </>
                            )}
                            {isBuilderLesson(lesson.lesson_type) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openQuestionManager({
                                  id: lesson.id,
                                  title: lesson.title,
                                  lesson_type: lesson.lesson_type as BuilderKind,
                                })}
                              >
                                Manage Questions
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteLesson(lesson.id)}>
                              Delete Lesson
                            </Button>
                          </div>
                        </div>

                        {lesson.lesson_type === 'video' && videoFormLessonId === lesson.id && (
                          <form
                            onSubmit={(event) => handleUploadVideo(event, lesson.id)}
                            className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
                          >
                            <div className="flex-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                Video file
                              </label>
                              <Input
                                name="video"
                                type="file"
                                required
                                accept="video/*"
                                className="mt-1 text-xs"
                              />
                            </div>
                            <Button type="submit" size="sm" disabled={loading}>Upload</Button>
                          </form>
                        )}

                        {lesson.lesson_type === 'pdf' && pdfFormLessonId === lesson.id && (
                          <form
                            onSubmit={(event) => handleUploadPdf(event, lesson.id)}
                            className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
                          >
                            <div className="flex-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                PDF file
                              </label>
                              <Input
                                name="pdf"
                                type="file"
                                required
                                accept="application/pdf,.pdf"
                                className="mt-1 text-xs"
                              />
                            </div>
                            <Button type="submit" size="sm" disabled={loading || uploadingLessonId === lesson.id}>
                              {uploadingLessonId === lesson.id ? (
                                <>
                                  <OrbitalSpinner className="mr-2 size-3" />
                                  Uploading...
                                </>
                              ) : (
                                'Upload'
                              )}
                            </Button>
                          </form>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="px-3 text-sm text-muted-foreground">No lessons yet</p>
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
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {enrollment.profiles?.full_name ?? enrollment.profiles?.email ?? enrollment.student_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                      {enrollment.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
