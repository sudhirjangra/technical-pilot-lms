'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@repo/shadcn/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/shadcn/alert-dialog';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Progress } from '@repo/shadcn/progress';
import { Separator } from '@repo/shadcn/separator';
import { Textarea } from '@repo/shadcn/textarea';
import {
  getTestForLesson,
  startTestAttempt,
  submitTestAttempt,
  saveAnswer,
  getStudentAttemptDetail,
  type StudentTest,
  type StudentQuestion,
  type TestAttempt,
  type SubmitResult,
  type AnswerPayload,
  type AttemptSummary,
  type TopicBreakdown,
} from '@/server/student/tests.server';
import {
  getAssignmentForLesson,
  startAssignmentAttempt,
  submitAssignmentAttempt,
  saveAssignmentAnswer,
  getStudentAssignmentAttemptDetail,
  type StudentAssignment,
  type AssignmentAttempt,
  type AssignmentSubmitResult,
  type AssignmentAnswerPayload,
  type AssignmentAttemptSummary,
} from '@/server/student/assignments.server';
import { toast } from '@repo/shadcn/sonner';
import { requestExtraAttempt } from '@/server/student-queries.server';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'error' | 'instructions' | 'test' | 'results';

type Answers = Record<
  string,
  { selectedOptionIds: string[]; textAnswer: string }
>;

type TimeSpent = Record<string, number>; // questionId → seconds

// Unified shape for both test and assignment modes
type UnifiedItem = StudentTest | StudentAssignment;

interface TestViewerProps {
  lessonId: string;
  courseId: string;
  mode?: 'test' | 'assignment';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimeLimit(seconds: number | null | undefined): string {
  if (!seconds) return 'Unlimited';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} minute${m !== 1 ? 's' : ''}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h} hour${h !== 1 ? 's' : ''}`;
}

// ── Animated clock SVG for instructions screen ────────────────────────────────

function AnimatedClock() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-24 h-24 mx-auto mb-2"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        opacity="0.2"
      />
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        strokeDasharray="276"
        strokeDashoffset="0"
        strokeLinecap="round"
        className="origin-center"
        style={{ animation: 'clock-spin 8s linear infinite', transformOrigin: '50px 50px' }}
      />
      {/* Hour hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="24"
        stroke="hsl(var(--foreground))"
        strokeWidth="4"
        strokeLinecap="round"
        style={{ animation: 'hour-hand 28800s linear infinite', transformOrigin: '50px 50px' }}
      />
      {/* Minute hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="18"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ animation: 'minute-hand 60s linear infinite', transformOrigin: '50px 50px' }}
      />
      <circle cx="50" cy="50" r="4" fill="hsl(var(--primary))" />
      <style>{`
        @keyframes clock-spin { to { stroke-dashoffset: -276; } }
        @keyframes minute-hand { to { transform: rotate(360deg); } }
        @keyframes hour-hand { to { transform: rotate(360deg); } }
      `}</style>
    </svg>
  );
}

// ── Timer component ───────────────────────────────────────────────────────────

function CountdownTimer({
  totalSeconds,
  onExpire,
}: {
  totalSeconds: number;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds, onExpire]);

  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 100;
  const isLow = remaining < 300; // < 5 minutes

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors',
        isLow ? 'border-destructive/60 bg-destructive/10' : 'border-border bg-muted/30',
      )}
    >
      <span
        className={cn(
          'text-2xl font-mono font-bold tabular-nums',
          isLow && 'text-destructive animate-pulse',
        )}
      >
        {formatSeconds(remaining)}
      </span>
      <Progress
        value={pct}
        className={cn('h-1.5 w-full', isLow ? '[&>div]:bg-destructive' : '')}
      />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        remaining
      </span>
    </div>
  );
}

// ── Time formatting helper ────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// ── Instructions phase ────────────────────────────────────────────────────────

function InstructionsScreen({
  test,
  attemptsUsed,
  allAttempts,
  onStart,
  starting,
  onViewAttempt,
  mode,
}: {
  test: UnifiedItem;
  attemptsUsed: number;
  allAttempts: AttemptSummary[] | AssignmentAttemptSummary[];
  onStart: () => void;
  starting: boolean;
  onViewAttempt: (attemptId: string) => void;
  mode: 'test' | 'assignment';
}) {
  const maxAttempts = test.max_attempts ?? null;
  const attemptsLeft = maxAttempts !== null ? maxAttempts - attemptsUsed : null;
  const instructions = 'instructions' in test ? test.instructions : null;
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const completedAttempts = allAttempts.filter((a) => a.completed_at);
  const everPassed = completedAttempts.some((a) => a.passed === true);
  const failedOut =
    attemptsLeft !== null && attemptsLeft <= 0 && !everPassed && completedAttempts.length > 0;

  const handleRequestExtraAttempt = async () => {
    setRequesting(true);
    const result = await requestExtraAttempt(mode, test.id);
    setRequesting(false);
    if (result.error) {
      toast.error(
        typeof result.error === 'string' ? result.error : 'Unable to send request',
      );
      return;
    }
    setRequested(true);
    toast.success('Request sent to the admin team.');
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <AnimatedClock />
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{test.title}</h2>
        <p className="text-muted-foreground text-sm">
          Read the instructions before starting
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-sm">
        <Card className="col-span-1">
          <CardContent className="p-3 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">Questions</span>
            <span className="text-xl font-bold">{test.questions.length}</span>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-3 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">Time Limit</span>
            <span className="text-xl font-bold">
              {formatTimeLimit(test.time_limit_seconds)}
            </span>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-3 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">Passing Score</span>
            <span className="text-xl font-bold">
              {test.passing_score_percent ?? 60}%
            </span>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-3 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">Attempts</span>
            <span className="text-xl font-bold">
              {maxAttempts !== null
                ? `${attemptsUsed} / ${maxAttempts}`
                : `${attemptsUsed} used`}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Previous attempts mini table */}
      {allAttempts.length > 0 && (
        <div className="w-full max-w-sm text-left">
          <p className="text-sm font-medium mb-2">Previous attempts</p>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border/40">
                  <th className="px-3 py-2 text-left text-muted-foreground font-medium">Submitted</th>
                  <th className="px-3 py-2 text-center text-muted-foreground font-medium">Score</th>
                  <th className="px-3 py-2 text-center text-muted-foreground font-medium">Result</th>
                  <th className="px-3 py-2 text-center text-muted-foreground font-medium">View</th>
                </tr>
              </thead>
              <tbody>
                {allAttempts.map((a, i) => (
                  <tr key={a.id} className={cn('border-b border-border/20 last:border-0', i === 0 ? 'bg-muted/20' : '')}>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.completed_at
                        ? new Date(a.completed_at).toLocaleDateString()
                        : a.started_at
                          ? `Started ${new Date(a.started_at).toLocaleDateString()}`
                          : '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-medium">
                      {a.percentage !== null && a.percentage !== undefined ? `${a.percentage}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {a.passed === true ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pass</span>
                      ) : a.passed === false ? (
                        <span className="text-destructive font-medium">Fail</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {a.completed_at && (
                        <button
                          type="button"
                          className="text-xs text-primary underline-offset-2 hover:underline"
                          onClick={() => onViewAttempt(a.id)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {attemptsLeft !== null && attemptsLeft <= 0 ? (
        <div className="w-full max-w-sm space-y-3">
          <p className="text-destructive text-sm font-medium">
            {failedOut
              ? 'You did not pass within your allotted attempts.'
              : 'You have used all your attempts for this test.'}
          </p>
          {failedOut && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-left">
              <p className="text-sm font-medium">Need another chance?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Send a request to the admin team for one additional attempt. You will be
                notified once it is reviewed.
              </p>
              <Button
                size="sm"
                className="mt-3 w-full"
                disabled={requesting || requested}
                onClick={handleRequestExtraAttempt}
              >
                {requested
                  ? 'Request sent'
                  : requesting
                    ? 'Sending…'
                    : 'Request +1 attempt'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {instructions && (
            <div className="text-left w-full max-w-sm rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium mb-1">Instructions</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{instructions}</p>
            </div>
          )}
          <div className="text-left w-full max-w-sm space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-medium">Rules</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Once started, the timer will not stop.</li>
              <li>Answers are auto-saved as you go.</li>
              <li>You must confirm before submitting.</li>
              <li>Time-expired tests are submitted automatically.</li>
              {attemptsLeft !== null && (
                <li>
                  You have{' '}
                  <strong>{attemptsLeft}</strong>{' '}
                  attempt{attemptsLeft !== 1 ? 's' : ''} remaining.
                </li>
              )}
            </ul>
          </div>

          <Button
            size="lg"
            onClick={onStart}
            disabled={starting}
            className="w-full max-w-sm"
          >
            {starting ? 'Starting…' : 'Start Now'}
          </Button>
        </>
      )}
    </div>
  );
}

// ── Question option card ──────────────────────────────────────────────────────

function OptionCard({
  id,
  text,
  selected,
  isMulti,
  onClick,
}: {
  id: string;
  text: string;
  selected: boolean;
  isMulti: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-lg border p-3 text-left text-sm transition-all duration-200',
        'hover:border-primary/60 hover:bg-primary/5',
        selected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
          : 'border-border bg-card',
      )}
    >
      <span
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 flex h-5 w-5 shrink-0 items-center justify-center',
          isMulti ? 'rounded-sm' : 'rounded-full',
          'border-2 transition-colors duration-200',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent',
        )}
      >
        {selected && (
          <svg
            viewBox="0 0 12 12"
            className="w-3 h-3 text-primary-foreground fill-current"
          >
            {isMulti ? (
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <circle cx="6" cy="6" r="3" />
            )}
          </svg>
        )}
      </span>
      <span className="pl-8">{text}</span>
    </button>
  );
}

// ── Question area ─────────────────────────────────────────────────────────────

function QuestionArea({
  question,
  questionIndex,
  totalQuestions,
  answer,
  onAnswerChange,
}: {
  question: StudentQuestion;
  questionIndex: number;
  totalQuestions: number;
  answer: { selectedOptionIds: string[]; textAnswer: string };
  onAnswerChange: (payload: { selectedOptionIds?: string[]; textAnswer?: string }) => void;
}) {
  const isMulti = question.question_type === 'msq';

  function toggleOption(optId: string) {
    if (question.question_type === 'mcq') {
      onAnswerChange({ selectedOptionIds: [optId] });
    } else {
      const current = answer.selectedOptionIds;
      const next = current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId];
      onAnswerChange({ selectedOptionIds: next });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Question {question.question_number ?? questionIndex + 1}
        </span>
        <span>/</span>
        <span>{totalQuestions}</span>
        <Badge variant="outline" className="ml-auto capitalize text-[10px]">
          {question.question_type === 'mcq'
            ? 'Single choice'
            : question.question_type === 'msq'
              ? 'Multiple choice'
              : 'Written answer'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {question.points} pt{question.points !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-base sm:text-lg font-medium leading-relaxed">
        {question.question_text}
      </p>

      {question.question_type === 'text' ? (
        <Textarea
          className="w-full min-h-[140px] text-sm resize-y"
          placeholder="Type your answer here…"
          value={answer.textAnswer}
          onChange={(e) => onAnswerChange({ textAnswer: e.target.value })}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {question.question_options.map((opt) => (
            <OptionCard
              key={opt.id}
              id={opt.id}
              text={opt.option_text}
              selected={answer.selectedOptionIds.includes(opt.id)}
              isMulti={isMulti}
              onClick={() => toggleOption(opt.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Question navigator panel ──────────────────────────────────────────────────

function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  onNavigate,
}: {
  questions: StudentQuestion[];
  currentIndex: number;
  answers: Answers;
  onNavigate: (index: number) => void;
}) {
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return (
      (a?.selectedOptionIds && a.selectedOptionIds.length > 0) ||
      (a?.textAnswer && a.textAnswer.trim().length > 0)
    );
  }).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Questions</span>
        <span className="text-muted-foreground text-xs">
          {answeredCount} / {questions.length} answered
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((q, i) => {
          const a = answers[q.id];
          const answered =
            (a?.selectedOptionIds && a.selectedOptionIds.length > 0) ||
            (a?.textAnswer && a.textAnswer.trim().length > 0);
          const isCurrent = i === currentIndex;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onNavigate(i)}
              className={cn(
                'h-8 w-full rounded text-xs font-medium transition-all duration-150',
                isCurrent
                  ? 'ring-2 ring-primary ring-offset-1 bg-primary text-primary-foreground'
                  : answered
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'
                    : 'border border-border text-muted-foreground hover:border-primary/50',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
          Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
          Current
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-border" />
          Unanswered
        </span>
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────

function ResultsScreen({
  result,
  test,
  courseId,
  allAttempts,
  attemptsUsed,
  onRetake,
  viewMode,
  onBackFromView,
}: {
  result: SubmitResult | AssignmentSubmitResult;
  test: UnifiedItem;
  courseId: string;
  allAttempts: AttemptSummary[] | AssignmentAttemptSummary[];
  attemptsUsed: number;
  onRetake: () => void;
  viewMode?: boolean;
  onBackFromView?: () => void;
}) {
  const router = useRouter();
  const passed = result.passed;
  const pct = result.percentage;
  const avgTime = result.avgTimePerQuestion ?? 0;

  const questionMap = new Map(test.questions.map((q) => [q.id, q]));
  const topicBreakdown: TopicBreakdown[] = (result.topicBreakdown ?? []) as TopicBreakdown[];
  const showTopics = topicBreakdown.length > 1;

  const maxAttempts = test.max_attempts ?? null;
  const canRetake = maxAttempts === null || attemptsUsed < maxAttempts;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Score Header ── */}
      <div className="text-center space-y-3 py-4">
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full w-28 h-28 text-4xl font-bold border-4',
            passed
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-destructive text-destructive',
          )}
        >
          {pct}%
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">
            {result.score} / {result.maxScore} pts
          </h2>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge
              className={cn(
                'text-sm px-3 py-0.5',
                passed
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                  : 'bg-destructive/20 text-destructive border-destructive/40',
              )}
              variant="outline"
            >
              {passed ? 'Passed' : 'Failed'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {result.correctCount} of {result.totalCount} correct
            {result.totalTimeSeconds ? (
              <span> &bull; {formatDuration(result.totalTimeSeconds)} total</span>
            ) : null}
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Topic Breakdown ── */}
      {showTopics && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Topic Breakdown</h3>
          <div className="space-y-2">
            {topicBreakdown.map((t) => {
              const pctCorrect = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
              return (
                <div key={t.topic} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.topic}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {t.correct}/{t.total}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDuration(t.totalTime)}</span>
                      <span className="text-xs text-muted-foreground">{t.earnedPoints}/{t.points} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pctCorrect >= 80 ? 'bg-emerald-500' : pctCorrect >= 50 ? 'bg-amber-500' : 'bg-destructive',
                        )}
                        style={{ width: `${pctCorrect}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{pctCorrect}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Attempt History ── */}
      {allAttempts.length > 1 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Attempt History</h3>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border/40">
                  <th className="px-3 py-2 text-left text-muted-foreground font-medium">#</th>
                  <th className="px-3 py-2 text-left text-muted-foreground font-medium">Submitted</th>
                  <th className="px-3 py-2 text-center text-muted-foreground font-medium">Score</th>
                  <th className="px-3 py-2 text-center text-muted-foreground font-medium">Result</th>
                  <th className="px-3 py-2 text-right text-muted-foreground font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {allAttempts.map((a, i) => (
                  <tr key={a.id} className={cn('border-b border-border/20 last:border-0', i === 0 ? 'bg-primary/5' : '')}>
                    <td className="px-3 py-2 text-muted-foreground font-mono">{allAttempts.length - i}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.completed_at
                        ? new Date(a.completed_at).toLocaleDateString()
                        : a.started_at
                          ? `Started ${new Date(a.started_at).toLocaleDateString()}`
                          : '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-medium">
                      {a.percentage !== null && a.percentage !== undefined ? `${a.percentage}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {a.passed === true ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pass</span>
                      ) : a.passed === false ? (
                        <span className="text-destructive font-medium">Fail</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {a.time_spent_seconds ? formatDuration(a.time_spent_seconds) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Question Review ── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Question Review</h3>
        {result.questionReview.map((review, i) => {
          const q = questionMap.get(review.questionId);
          const questionText = review.questionText || q?.question_text || '';
          const questionType = review.questionType || q?.question_type || 'mcq';
          const isText = questionType === 'text';

          const timeColor =
            avgTime > 0
              ? review.timeSpentSeconds > avgTime * 2
                ? 'bg-destructive/20 text-destructive border-destructive/30'
                : review.timeSpentSeconds < avgTime * 0.5
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted/40 text-muted-foreground border-border/40'
              : 'bg-muted/40 text-muted-foreground border-border/40';

          return (
            <Card
              key={review.questionId}
              className={cn(
                'border',
                review.isCorrect === true
                  ? 'border-emerald-500/40'
                  : review.isCorrect === false
                    ? 'border-destructive/40'
                    : 'border-border',
              )}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0 font-mono">Q{i + 1}</span>
                  {review.topic && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {review.topic}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
                    {questionType}
                  </Badge>
                  <span className={cn('text-[10px] px-1.5 py-0 rounded border shrink-0 font-mono', timeColor)}>
                    {formatDuration(review.timeSpentSeconds ?? 0)}
                  </span>
                  <div className="flex-1" />
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px]',
                      review.isCorrect === true
                        ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                        : review.isCorrect === false
                          ? 'border-destructive/50 text-destructive'
                          : 'border-border text-muted-foreground',
                    )}
                  >
                    {review.isCorrect === true
                      ? `+${review.pointsEarned} pts`
                      : review.isCorrect === null
                        ? 'Manual grading'
                        : `0 / ${review.points} pts`}
                  </Badge>
                </div>
                <p className="text-sm font-medium leading-snug mt-1">{questionText}</p>
              </CardHeader>
              <CardContent className="pb-3 px-4 space-y-2">
                {isText ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Your answer:</p>
                    <p className="text-sm bg-muted/40 rounded p-2 whitespace-pre-wrap">
                      {review.textAnswer || (
                        <em className="text-muted-foreground">No answer provided</em>
                      )}
                    </p>
                  </div>
                ) : q ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.question_options.map((opt) => {
                      const isSelected = review.selectedOptionIds.includes(opt.id);
                      const isCorrectOpt = review.correctOptionIds.includes(opt.id);
                      // Four distinct states so "what I picked" is never confused with "what was right".
                      const state = isSelected && isCorrectOpt
                        ? 'correctPicked'
                        : isSelected
                          ? 'wrongPicked'
                          : isCorrectOpt
                            ? 'missedCorrect'
                            : 'neutral';
                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            'flex items-center gap-2 rounded border px-3 py-2 text-xs',
                            state === 'correctPicked' &&
                              'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                            state === 'wrongPicked' &&
                              'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400',
                            state === 'missedCorrect' &&
                              'border-sky-500 border-dashed bg-sky-500/10 text-sky-700 dark:text-sky-300',
                            state === 'neutral' && 'border-border text-muted-foreground',
                          )}
                        >
                          <span className="flex-1">{opt.option_text}</span>
                          {state === 'correctPicked' && (
                            <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                              Your answer · Correct
                            </span>
                          )}
                          {state === 'wrongPicked' && (
                            <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                              Your answer · Wrong
                            </span>
                          )}
                          {state === 'missedCorrect' && (
                            <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                              Correct answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {review.explanation && (
                  <div className="mt-1 rounded bg-primary/5 border border-primary/20 p-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Explanation: </span>
                    {review.explanation}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Footer actions ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {viewMode ? (
          <Button variant="outline" onClick={onBackFromView} className="flex-1">
            ← Back to Attempts
          </Button>
        ) : (
          <>
            {canRetake && (
              <Button variant="default" onClick={onRetake} className="flex-1">
                Retake
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/courses/${courseId}`)}
              className="flex-1"
            >
              Back to Course
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main TestViewer ───────────────────────────────────────────────────────────

export function TestViewer({ lessonId, courseId, mode = 'test' }: TestViewerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [test, setTest] = useState<UnifiedItem | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attempt, setAttempt] = useState<TestAttempt | AssignmentAttempt | null>(null);
  const [starting, setStarting] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [timeSpent, setTimeSpent] = useState<TimeSpent>({});
  const questionEnterTime = useRef<number>(Date.now());

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<SubmitResult | AssignmentSubmitResult | null>(null);
  const [autoExpired, setAutoExpired] = useState(false);
  const [allAttempts, setAllAttempts] = useState<AttemptSummary[] | AssignmentAttemptSummary[]>([]);

  const [viewingResult, setViewingResult] = useState<SubmitResult | AssignmentSubmitResult | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (mode === 'assignment') {
        const res = await getAssignmentForLesson(lessonId);
        if (cancelled) return;
        if ('error' in res) { setErrorMsg(res.error); setPhase('error'); return; }
        setTest(res.data.assignment);
        setAttemptsUsed(res.data.attempts_used);
        setAllAttempts(res.data.attempts as AssignmentAttemptSummary[]);
      } else {
        const res = await getTestForLesson(lessonId);
        if (cancelled) return;
        if ('error' in res) { setErrorMsg(res.error); setPhase('error'); return; }
        setTest(res.data.test);
        setAttemptsUsed(res.data.attempts_used);
        setAllAttempts(res.data.attempts as AttemptSummary[]);
      }
      setPhase('instructions');
    }
    load();
    return () => { cancelled = true; };
  }, [lessonId, mode]);

  // ── Auto-save every 30s ─────────────────────────────────────────────────────

  const doAutoSave = useCallback(async () => {
    if (!attempt || phase !== 'test') return;
    const q = test?.questions[currentIndex];
    if (!q) return;
    const a = answers[q.id] ?? { selectedOptionIds: [], textAnswer: '' };
    const elapsed = Math.floor((Date.now() - questionEnterTime.current) / 1000);
    const payload = {
      selectedOptionIds: a.selectedOptionIds,
      textAnswer: a.textAnswer || undefined,
      timeSpentSeconds: (timeSpent[q.id] ?? 0) + elapsed,
    };
    if (mode === 'assignment') {
      await saveAssignmentAnswer(attempt.id, q.id, payload);
    } else {
      await saveAnswer(attempt.id, q.id, payload);
    }
  }, [attempt, phase, test, currentIndex, answers, timeSpent, mode]);

  useEffect(() => {
    if (phase !== 'test') return;
    autoSaveTimer.current = setInterval(doAutoSave, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [phase, doAutoSave]);

  // ── Navigation guard ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'test') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  // ── Track time per question ─────────────────────────────────────────────────

  function recordTimeForCurrentQuestion() {
    const q = test?.questions[currentIndex];
    if (!q) return;
    const elapsed = Math.floor((Date.now() - questionEnterTime.current) / 1000);
    setTimeSpent((prev) => ({
      ...prev,
      [q.id]: (prev[q.id] ?? 0) + elapsed,
    }));
    questionEnterTime.current = Date.now();
  }

  function navigateTo(index: number) {
    recordTimeForCurrentQuestion();
    setCurrentIndex(index);
    questionEnterTime.current = Date.now();
  }

  // ── Start test ──────────────────────────────────────────────────────────────

  async function markLessonCompleteIfPassed(
    submitResult: SubmitResult | AssignmentSubmitResult,
  ) {
    if (!lessonId) return;
    if (!('passed' in submitResult) || !submitResult.passed) return;

    try {
      await fetch(`/api/progress/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', progress_percent: 100 }),
      });
    } catch {
      // swallow: progress sync is best effort, but the view should still show result.
    } finally {
      // Course TOC / progress are server-rendered, so they need an explicit refresh.
      router.refresh();
    }
  }

  async function handleStart() {
    if (!test) return;
    setStarting(true);
    const res = mode === 'assignment'
      ? await startAssignmentAttempt(test.id)
      : await startTestAttempt(test.id);
    setStarting(false);
    if ('error' in res) {
      setErrorMsg(res.error);
      setPhase('error');
      return;
    }
    setAttempt(res.data);
    setAttemptsUsed((n) => n + 1);
    questionEnterTime.current = Date.now();
    setPhase('test');
  }

  // ── Answer change ───────────────────────────────────────────────────────────

  function handleAnswerChange(
    questionId: string,
    payload: { selectedOptionIds?: string[]; textAnswer?: string },
  ) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { selectedOptionIds: [], textAnswer: '' };
      return {
        ...prev,
        [questionId]: {
          selectedOptionIds:
            payload.selectedOptionIds !== undefined
              ? payload.selectedOptionIds
              : current.selectedOptionIds,
          textAnswer:
            payload.textAnswer !== undefined
              ? payload.textAnswer
              : current.textAnswer,
        },
      };
    });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!attempt || !test) return;
    setSubmitting(true);

    // Capture time for current question before submitting
    recordTimeForCurrentQuestion();

    const answerPayloads: AnswerPayload[] = test.questions.map((q) => {
      const a = answers[q.id] ?? { selectedOptionIds: [], textAnswer: '' };
      return {
        questionId: q.id,
        selectedOptionIds: a.selectedOptionIds,
        textAnswer: a.textAnswer || undefined,
        timeSpentSeconds: timeSpent[q.id] ?? 0,
      };
    });

    if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);

    const res = mode === 'assignment'
      ? await submitAssignmentAttempt(attempt.id, answerPayloads as AssignmentAnswerPayload[])
      : await submitTestAttempt(attempt.id, answerPayloads);
    setSubmitting(false);
    if ('error' in res) {
      setErrorMsg(res.error);
      setPhase('error');
      return;
    }
    const nextResult = res.data;
    setResult(nextResult);
    void markLessonCompleteIfPassed(nextResult);
    // Push a summary of this new attempt to allAttempts
    if (attempt) {
      const newSummary: AttemptSummary = {
        id: attempt.id,
        started_at: attempt.started_at,
        completed_at: new Date().toISOString(),
        score: res.data.score,
        max_score: res.data.maxScore,
        percentage: res.data.percentage,
        passed: res.data.passed,
        time_spent_seconds: res.data.totalTimeSeconds ?? 0,
      };
      setAllAttempts((prev) => [newSummary, ...(prev as AttemptSummary[])] as AttemptSummary[]);
    }
    setPhase('results');
  }

  function handleTimerExpire() {
    setAutoExpired(true);
    setSubmitDialogOpen(true);
  }

  // ── Count answered ──────────────────────────────────────────────────────────

  const answeredCount =
    test?.questions.filter((q) => {
      const a = answers[q.id];
      return (
        (a?.selectedOptionIds && a.selectedOptionIds.length > 0) ||
        (a?.textAnswer && a.textAnswer.trim().length > 0)
      );
    }).length ?? 0;

  const totalQuestions = test?.questions.length ?? 0;
  const currentQuestion = test?.questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? { selectedOptionIds: [], textAnswer: '' }
    : { selectedOptionIds: [], textAnswer: '' };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <span className="animate-pulse">Loading test…</span>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6 pb-4 text-sm text-destructive">
          {errorMsg ?? 'Failed to load test. Please try again.'}
        </CardContent>
      </Card>
    );
  }

  if (phase === 'instructions' && test) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 pb-6">
          {loadingView ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              <span className="animate-pulse">Loading attempt…</span>
            </div>
          ) : (
            <InstructionsScreen
              test={test}
              attemptsUsed={attemptsUsed}
              allAttempts={allAttempts}
              onStart={handleStart}
              starting={starting}
              onViewAttempt={handleViewAttempt}
              mode={mode}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  async function handleViewAttempt(attemptId: string) {
    setLoadingView(true);
    const res = mode === 'assignment'
      ? await getStudentAssignmentAttemptDetail(attemptId)
      : await getStudentAttemptDetail(attemptId);
    setLoadingView(false);
    if ('error' in res) {
      toast.error(res.error);
      return;
    }
    setViewingResult(res.data as SubmitResult | AssignmentSubmitResult);
    setPhase('results');
  }

  function handleBackFromView() {
    setViewingResult(null);
    setPhase('instructions');
  }

  function handleRetake() {
    setPhase('instructions');
    setResult(null);
    setViewingResult(null);
    setAnswers({});
    setTimeSpent({});
    setAttempt(null);
    setCurrentIndex(0);
    setAutoExpired(false);
  }

  if (phase === 'results' && (result || viewingResult) && test) {
    const displayResult = viewingResult ?? result!;
    return (
      <ResultsScreen
        result={displayResult}
        test={test}
        courseId={courseId}
        allAttempts={allAttempts}
        attemptsUsed={attemptsUsed}
        onRetake={handleRetake}
        viewMode={!!viewingResult}
        onBackFromView={handleBackFromView}
      />
    );
  }

  if (phase !== 'test' || !test || !currentQuestion) return null;

  return (
    <>
      {/* Submit confirmation dialog */}
      <AlertDialog
        open={submitDialogOpen}
        onOpenChange={(open) => {
          if (!open && !autoExpired) setSubmitDialogOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {autoExpired ? 'Time is up!' : 'Submit Test?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {autoExpired
                ? 'Your time has expired. The test will be submitted now.'
                : `You have answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to submit?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!autoExpired && (
              <AlertDialogCancel disabled={submitting}>
                Cancel
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(autoExpired ? 'w-full' : '')}
            >
              {submitting ? 'Submitting…' : 'Submit Test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main test layout */}
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        {/* Left: question area */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <Card>
            <CardContent className="pt-6 pb-6">
              <QuestionArea
                question={currentQuestion}
                questionIndex={currentIndex}
                totalQuestions={totalQuestions}
                answer={currentAnswer}
                onAnswerChange={(payload) =>
                  handleAnswerChange(currentQuestion.id, payload)
                }
              />
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigateTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex-1"
            >
              Previous
            </Button>
            {currentIndex < totalQuestions - 1 ? (
              <Button
                onClick={() => navigateTo(currentIndex + 1)}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={() => setSubmitDialogOpen(true)}
                disabled={submitting}
                variant="default"
                className="flex-1"
              >
                Submit Test
              </Button>
            )}
          </div>
        </div>

        {/* Right: navigator panel */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
          {test.time_limit_seconds ? (
            <CountdownTimer
              totalSeconds={test.time_limit_seconds}
              onExpire={handleTimerExpire}
            />
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              No time limit
            </div>
          )}

          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Navigator</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <QuestionNavigator
                questions={test.questions}
                currentIndex={currentIndex}
                answers={answers}
                onNavigate={navigateTo}
              />
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setSubmitDialogOpen(true)}
            disabled={submitting}
          >
            Submit Test
          </Button>
        </div>
      </div>
    </>
  );
}
