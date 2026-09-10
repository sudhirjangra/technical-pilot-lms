'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@repo/shadcn/lib/utils';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { OrbitalSpinner } from '@repo/shadcn/orbital-spinner';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  ExternalLink,
  HelpCircle,
  Percent,
  Timer,
  Trophy,
  XCircle,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
} from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import {
  getStudentAssignmentAttemptDetail,
  type MyAssignmentAttempt,
  type AssignmentSubmitResult,
} from '@/server/student/assignments.server';
import {
  getStudentAttemptDetail,
  type MyTestAttempt,
  type SubmitResult,
} from '@/server/student/tests.server';

type Attempt = MyAssignmentAttempt | MyTestAttempt;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(totalSeconds?: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function AttemptsClient({ attempts }: { attempts: Attempt[] }) {
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [detailData, setDetailData] = useState<SubmitResult | AssignmentSubmitResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const CATEGORY_COLORS = [
    '#3b82f6',
    '#10b981',
    '#8b5cf6',
    '#f59e0b',
    '#06b6d4',
    '#ec4899',
    '#6366f1',
    '#14b8a6',
    '#f97316',
    '#84cc16',
  ];

  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string | null>(null);

  // Performance metrics calculation
  const passedAttempts = attempts.filter((a) => a.passed === true);
  const failedAttempts = attempts.filter((a) => a.passed === false);
  const pendingAttempts = attempts.filter((a) => a.passed == null);

  const completedWithScore = attempts.filter(
    (a) => a.percentage !== null && a.percentage !== undefined,
  );
  const avgScore =
    completedWithScore.length > 0
      ? Math.round(
          completedWithScore.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
            completedWithScore.length,
        )
      : 0;

  const passRate =
    passedAttempts.length + failedAttempts.length > 0
      ? Math.round(
          (passedAttempts.length /
            (passedAttempts.length + failedAttempts.length)) *
            100,
        )
      : 0;

  // Pie chart data: outcomes
  const outcomeData = [
    { name: 'Passed', value: passedAttempts.length, color: '#10b981' },
    { name: 'Failed', value: failedAttempts.length, color: '#ef4444' },
    ...(pendingAttempts.length > 0
      ? [{ name: 'In Progress', value: pendingAttempts.length, color: '#f59e0b' }]
      : []),
  ].filter((d) => d.value > 0);

  // Bar chart data: recent 10 attempts in chronological order (oldest to newest for trend)
  const recentTrend = [...attempts]
    .filter((a) => a.percentage !== null && a.percentage !== undefined)
    .slice(0, 10)
    .reverse()
    .map((a, i) => {
      const score = Math.min(100, Math.max(0, Math.round(a.percentage ?? 0)));
      const title = a.testTitle || `Attempt ${i + 1}`;
      const shortTitle = title.length > 12 ? title.slice(0, 12) + '…' : title;
      return {
        name: shortTitle,
        fullTitle: title,
        score,
        passed: a.passed,
        date: formatDate(a.completed_at || a.started_at),
        type: a.type,
      };
    });


  const handleOpenDetail = async (attempt: Attempt) => {
    setSelectedAttempt(attempt);
    setDetailData(null);
    setLoadingDetail(true);
    setIsDialogOpen(true);

    try {
      const res =
        attempt.type === 'assignment'
          ? await getStudentAssignmentAttemptDetail(attempt.id)
          : await getStudentAttemptDetail(attempt.id);

      if ('error' in res) {
        toast.error(typeof res.error === 'string' ? res.error : 'Failed to load attempt detail');
      } else {
        setDetailData(res.data);
      }
    } catch {
      toast.error('Failed to load attempt details');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">Your learning performance record</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Attempt History & Analytics</h1>
        </div>
        <Badge variant="outline" className="w-fit text-xs">
          {attempts.length} total attempt{attempts.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Attempts</p>
              <p className="text-xl sm:text-2xl font-bold">{attempts.length}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ClipboardList className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Passed</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {passedAttempts.length}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pass Rate</p>
              <p className="text-xl sm:text-2xl font-bold">{passRate}%</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <TrendingUp className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Average Score</p>
              <p className="text-xl sm:text-2xl font-bold font-mono">{avgScore}%</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Trophy className="size-4 sm:size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Visual Charts */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Outcome Pie Chart */}
          <Card>
            <CardHeader className="p-3.5 sm:p-5 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                <PieChartIcon className="size-4 text-primary shrink-0" />
                Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center">
              {outcomeData.length === 0 ? (
                <p className="text-xs text-muted-foreground py-10">No completed attempt data yet</p>
              ) : (
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          fontSize: 12,
                          color: '#fff',
                        }}
                      />
                      <RechartsLegend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Scores Bar Chart */}
          <Card>
            <CardHeader className="p-3.5 sm:p-5 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                <BarChart3 className="size-4 text-primary shrink-0" />
                Recent Scores History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {recentTrend.length === 0 ? (
                <p className="text-xs text-muted-foreground py-10 text-center">No scores recorded yet</p>
              ) : (
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recentTrend} margin={{ top: 15, right: 15, left: -5, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis
                        domain={[0, 100]}
                        width={36}
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                        tickFormatter={(v) => `${v}%`}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0 && payload[0]) {
                            const data = payload[0].payload;
                            if (!data) return null;
                            return (
                              <div className="rounded-lg border bg-popover/95 p-2 shadow-md text-xs text-popover-foreground">
                                <p className="font-semibold">{data.fullTitle}</p>
                                <p className="text-muted-foreground">{data.date} · {data.type}</p>
                                <p className="mt-1 font-mono font-bold text-primary">
                                  Score: {data.score}% ({data.passed ? 'Pass' : 'Fail'})
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="score" name="Score %" radius={[4, 4, 0, 0]}>
                        {recentTrend.map((entry, index) => (
                          <Cell
                            key={`bar-${index}`}
                            fill={entry.passed === false ? '#ef4444' : '#10b981'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
            <ClipboardList className="size-4 text-primary shrink-0" />
            Assessment history
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ClipboardList className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No attempts yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] sm:text-xs text-muted-foreground bg-muted/30">
                    <th className="px-3 py-2.5 font-medium">Assessment</th>
                    <th className="hidden sm:table-cell px-3 py-2.5 font-medium">Course</th>
                    <th className="hidden md:table-cell px-3 py-2.5 font-medium">Date</th>
                    <th className="px-3 py-2.5 text-center font-medium">Score</th>
                    <th className="px-3 py-2.5 text-center font-medium">Result</th>
                    <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {attempts.map((attempt) => (
                    <tr key={`${attempt.type}-${attempt.id}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 max-w-[200px] sm:max-w-none">
                        <div className="font-medium truncate">{attempt.testTitle}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:hidden">
                          <span className="capitalize">{attempt.type}</span>
                          <span>•</span>
                          <span className="truncate">{attempt.courseTitle}</span>
                        </div>
                        <div className="hidden sm:block text-[11px] text-muted-foreground capitalize">
                          {attempt.type}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2.5 text-muted-foreground text-xs">
                        {attempt.courseTitle}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-muted-foreground text-xs">
                        {attempt.completed_at ? formatDate(attempt.completed_at) : 'In progress'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-semibold">
                        {attempt.percentage != null ? `${Math.round(attempt.percentage)}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {attempt.passed === true ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Pass
                          </Badge>
                        ) : attempt.passed === false ? (
                          <Badge variant="outline" className="text-[10px] border-destructive/40 bg-destructive/10 text-destructive">
                            Fail
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            In progress
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => handleOpenDetail(attempt)}
                          >
                            <Eye className="size-3" />
                            <span className="hidden sm:inline">Review</span>
                          </Button>
                          {attempt.courseId && attempt.lessonId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                              asChild
                            >
                              <Link
                                href={`/dashboard/courses/${attempt.courseId}/lessons/${attempt.lessonId}`}
                                title="Go to Lesson"
                              >
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attempt Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,840px)] max-w-[96vw] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs uppercase font-mono">
                {selectedAttempt?.type}
              </Badge>
              {selectedAttempt?.passed === true ? (
                <Badge variant="outline" className="text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Passed
                </Badge>
              ) : selectedAttempt?.passed === false ? (
                <Badge variant="outline" className="text-xs border-destructive/40 bg-destructive/10 text-destructive">
                  Failed
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold">
              {selectedAttempt?.testTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedAttempt?.courseTitle} · Attempted on{' '}
              {selectedAttempt?.started_at ? formatDate(selectedAttempt.started_at) : '—'}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <OrbitalSpinner className="size-8" />
              <p className="text-xs text-muted-foreground">Loading attempt results and questions…</p>
            </div>
          ) : detailData ? (
            <div className="space-y-4 pt-2">
              {/* Score & Timing KPI bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
                  <span className="block text-[11px] text-muted-foreground">Score</span>
                  <span className="text-base sm:text-lg font-bold font-mono">
                    {detailData.score}/{detailData.maxScore} ({Math.round(detailData.percentage)}%)
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
                  <span className="block text-[11px] text-muted-foreground">Correct Answers</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {detailData.correctCount}/{detailData.totalCount}
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
                  <span className="block text-[11px] text-muted-foreground">Time Spent</span>
                  <span className="text-base sm:text-lg font-bold">
                    {formatDuration(detailData.totalTimeSeconds)}
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/20 p-2.5 text-center">
                  <span className="block text-[11px] text-muted-foreground">Avg / Question</span>
                  <span className="text-base sm:text-lg font-bold">
                    {formatDuration(detailData.avgTimePerQuestion)}
                  </span>
                </div>
              </div>

              {/* Topic Breakdown & Categories Pie/Bar Chart */}
              {detailData.topicBreakdown && detailData.topicBreakdown.length > 0 && (
                <div className="space-y-4 rounded-xl border p-4 bg-muted/10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <PieChartIcon className="size-4 text-primary" />
                      Category & Topic Analysis
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Hover for detailed statistics · Click a category to filter questions
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Category Distribution Pie Chart */}
                    <div className="rounded-lg border bg-card/60 p-3 flex flex-col items-center">
                      <p className="text-xs font-medium text-muted-foreground self-start mb-1">
                        Category Distribution (Questions)
                      </p>
                      <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={detailData.topicBreakdown.map((t, idx) => ({
                                name: t.topic,
                                value: t.total,
                                correct: t.correct,
                                missed: Math.max(0, t.total - t.correct),
                                accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
                                points: t.points,
                                earnedPoints: t.earnedPoints,
                                totalTime: t.totalTime,
                                color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                              }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={42}
                              outerRadius={68}
                              paddingAngle={3}
                              onClick={(entry) => {
                                const topicName = (entry as any)?.name;
                                setSelectedTopicFilter((prev) => (prev === topicName ? null : topicName));
                              }}
                              className="cursor-pointer"
                            >
                              {detailData.topicBreakdown.map((t, idx) => {
                                const isSelected = selectedTopicFilter === t.topic;
                                return (
                                  <Cell
                                    key={`pie-topic-${idx}`}
                                    fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                                    stroke={isSelected ? '#ffffff' : 'transparent'}
                                    strokeWidth={isSelected ? 3 : 1}
                                    opacity={selectedTopicFilter && !isSelected ? 0.45 : 1}
                                  />
                                );
                              })}
                            </Pie>
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length > 0 && payload[0]) {
                                  const data = payload[0].payload;
                                  if (!data) return null;
                                  return (
                                    <div className="rounded-lg border bg-popover/95 p-2.5 shadow-lg text-xs text-popover-foreground min-w-[170px] space-y-1">
                                      <p className="font-semibold text-foreground">{data.name}</p>
                                      <div className="text-[11px] space-y-0.5 pt-0.5 border-t border-border/50">
                                        <p className="flex justify-between">
                                          <span className="text-muted-foreground">Questions:</span>
                                          <span className="font-mono font-medium">{data.value}</span>
                                        </p>
                                        <p className="flex justify-between">
                                          <span className="text-muted-foreground">Correct:</span>
                                          <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                            {data.correct}/{data.value} ({data.accuracy}%)
                                          </span>
                                        </p>
                                        <p className="flex justify-between">
                                          <span className="text-muted-foreground">Points:</span>
                                          <span className="font-mono font-medium">{data.earnedPoints}/{data.points} pts</span>
                                        </p>
                                        <p className="flex justify-between">
                                          <span className="text-muted-foreground">Time Spent:</span>
                                          <span className="font-medium">{formatDuration(data.totalTime)}</span>
                                        </p>
                                      </div>
                                      <p className="text-[10px] text-primary italic pt-1">
                                        Click to {selectedTopicFilter === data.name ? 'clear' : 'filter questions'}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Category Accuracy / Comparison Bar Chart */}
                    <div className="rounded-lg border bg-card/60 p-3 flex flex-col">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Category Accuracy (Correct vs Missed)
                      </p>
                      <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={detailData.topicBreakdown.map((t) => ({
                              topic: t.topic.length > 12 ? t.topic.slice(0, 12) + '…' : t.topic,
                              fullTopic: t.topic,
                              correct: t.correct,
                              incorrect: Math.max(0, t.total - t.correct),
                              total: t.total,
                              accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
                              points: t.points,
                              earnedPoints: t.earnedPoints,
                            }))}
                            margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                            <XAxis dataKey="topic" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" />
                            <YAxis allowDecimals={false} width={30} tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length > 0 && payload[0]) {
                                  const data = payload[0].payload;
                                  if (!data) return null;
                                  return (
                                    <div className="rounded-lg border bg-popover/95 p-2 shadow-md text-xs text-popover-foreground">
                                      <p className="font-semibold">{data.fullTopic}</p>
                                      <p className="text-emerald-600 dark:text-emerald-400 font-mono">
                                        Correct: {data.correct} / {data.total} ({data.accuracy}%)
                                      </p>
                                      {data.incorrect > 0 && (
                                        <p className="text-destructive font-mono">
                                          Missed: {data.incorrect}
                                        </p>
                                      )}
                                      <p className="text-muted-foreground text-[11px] mt-0.5">
                                        Points: {data.earnedPoints} / {data.points}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="correct" name="Correct" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="incorrect" name="Missed" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Category Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant={selectedTopicFilter === null ? 'default' : 'outline'}
                      className="h-6 px-2.5 text-[11px] rounded-full"
                      onClick={() => setSelectedTopicFilter(null)}
                    >
                      All Categories ({detailData.questionReview?.length ?? detailData.totalCount})
                    </Button>
                    {detailData.topicBreakdown.map((t, idx) => {
                      const isSelected = selectedTopicFilter === t.topic;
                      const pctCorrect = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
                      return (
                        <button
                          key={t.topic}
                          type="button"
                          onClick={() => setSelectedTopicFilter(isSelected ? null : t.topic)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border transition-all duration-150',
                            isSelected
                              ? 'border-primary bg-primary/15 text-primary font-medium ring-1 ring-primary/40'
                              : 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-primary/40',
                          )}
                        >
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                          />
                          <span>{t.topic}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            ({t.correct}/{t.total} · {pctCorrect}%)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Questions Review */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Question Breakdown ({detailData.questionReview?.length ?? 0})
                  </p>
                  {selectedTopicFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary"
                      onClick={() => setSelectedTopicFilter(null)}
                    >
                      Showing: {selectedTopicFilter} (Clear filter ✕)
                    </Button>
                  )}
                </div>

                {(!detailData.questionReview || detailData.questionReview.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No individual question records available for this attempt.
                  </p>
                ) : (
                  detailData.questionReview
                    .filter((q) => !selectedTopicFilter || (q.topic || 'General') === selectedTopicFilter)
                    .map((q, idx) => (
                      <div
                        key={q.questionId || idx}
                        className="rounded-lg border bg-card/60 p-3 space-y-2 text-xs sm:text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {q.isCorrect === true ? (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : q.isCorrect === false ? (
                              <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                            ) : (
                              <HelpCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <p className="font-medium text-foreground">
                              {idx + 1}. {q.questionText}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {q.topic && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {q.topic}
                              </Badge>
                            )}
                            <Badge
                              variant={q.isCorrect ? 'default' : q.isCorrect === false ? 'destructive' : 'secondary'}
                              className="shrink-0 text-[10px]"
                            >
                              {q.pointsEarned ?? (q.isCorrect ? q.points ?? 0 : 0)}/{q.points ?? 1} pt
                            </Badge>
                          </div>
                        </div>

                        {/* Options or Text Answer */}
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-1 pl-6">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className={`rounded px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 ${
                                  opt.isCorrect
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/30'
                                    : opt.isSelected
                                      ? 'bg-destructive/10 text-destructive border border-destructive/30'
                                      : 'bg-muted/30 text-muted-foreground'
                                }`}
                              >
                                <span>{opt.text}</span>
                                <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                  {opt.isSelected && <span>(Your choice)</span>}
                                  {opt.isCorrect && <span>✓ Correct</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : q.textAnswer ? (
                          <div className="pl-6 space-y-1">
                            <p className="text-[11px] text-muted-foreground">Your answer:</p>
                            <p className="rounded bg-muted/40 p-2 text-xs">{q.textAnswer}</p>
                          </div>
                        ) : null}

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="pl-6 pt-1">
                            <p className="rounded border border-primary/20 bg-primary/5 p-2 text-[11px] text-muted-foreground">
                              <strong className="text-primary">Explanation:</strong> {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Unable to load attempt details.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
