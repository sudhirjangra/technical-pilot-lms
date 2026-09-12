'use client';

import React, { useMemo } from 'react';
import { cn } from '@repo/shadcn/lib/utils';
import { Badge } from '@repo/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Target,
} from '@repo/shadcn/lucide';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Cell,
} from 'recharts';

export interface BreakdownItem {
  name: string;
  total: number;
  correct: number;
  accuracy: number;
  totalTime?: number;
  points?: number;
  earnedPoints?: number;
}

export interface PersonalizedImprovementProps {
  topicBreakdown?: {
    topic: string;
    total: number;
    correct: number;
    totalTime?: number;
    points?: number;
    earnedPoints?: number;
  }[];
  categoryBreakdown?: {
    category: string;
    total: number;
    correct: number;
    totalTime?: number;
    points?: number;
    earnedPoints?: number;
  }[];
  difficultyBreakdown?: {
    difficulty: 'easy' | 'medium' | 'hard' | string;
    total: number;
    correct: number;
    totalTime?: number;
    points?: number;
    earnedPoints?: number;
  }[];
  questionReview?: {
    questionId: string;
    isCorrect?: boolean | null;
    questionCategory?: string | null;
    questionDifficulty?: 'easy' | 'medium' | 'hard' | string | null;
    topic?: string | null;
    subtopic?: string | null;
    timeSpentSeconds?: number | null;
  }[];
  title?: string;
  className?: string;
}

const DEFAULT_ADVICE = {
  icon: '🎯',
  weakTip:
    'Targeted Question Practice: Solve focused practice sets in this area to improve familiarity and retention.',
  strongTip:
    'Consistent accuracy maintained in this question format.',
};

const CATEGORY_ADVICE: Record<
  string,
  {
    icon: string;
    weakTip: string;
    strongTip: string;
  }
> = {
  calculation: {
    icon: '⚡',
    weakTip:
      'Computational Accuracy: Practice step-by-step derivations and double-check arithmetic and sign steps on rough work.',
    strongTip:
      'Strong calculation speed and numerical precision! Keep maintaining speed drills.',
  },
  reasoning: {
    icon: '🧠',
    weakTip:
      'Logical Deduction: Systematically eliminate distractors and analyze the underlying premises before picking an answer.',
    strongTip:
      'Solid deductive reasoning demonstrated on tricky multi-premise questions.',
  },
  numerical: {
    icon: '🔢',
    weakTip:
      'Numerical Problem Solving: Pay close attention to unit conversions, standard decimal limits, and intermediate substitutions.',
    strongTip:
      'High accuracy on numerical value problems and physical quantities.',
  },
  conceptual: {
    icon: '💡',
    weakTip:
      'Core Theoretical Concepts: Revisit fundamental definitions, laws, and summary formulas to clarify theoretical boundaries.',
    strongTip:
      'Clear grasp of underlying definitions and foundational theory.',
  },
  other: DEFAULT_ADVICE,
};

function formatCategoryName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategoryAdvice(name: string) {
  const normalized = name.toLowerCase().replace(/[_\s-]+/g, '');
  for (const [key, value] of Object.entries(CATEGORY_ADVICE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return {
    icon: '🎯',
    weakTip: `Targeted Practice: Review core principles and solve focused practice questions for ${formatCategoryName(name)}.`,
    strongTip: `Solid accuracy and concept retention maintained in ${formatCategoryName(name)}.`,
  };
}

const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; color: string; weakThreshold: number; weakTip: string }
> = {
  easy: {
    label: 'Easy',
    color: '#10b981', // emerald-500
    weakThreshold: 80,
    weakTip:
      'Foundational Alert: Easy questions should be high-yield scoring marks. Revisit basic definitions to eliminate avoidable slips.',
  },
  medium: {
    label: 'Medium',
    color: '#f59e0b', // amber-500
    weakThreshold: 60,
    weakTip:
      'Application Level: Practice mixed-topic multi-step problems to bridge foundational theory with application.',
  },
  hard: {
    label: 'Hard',
    color: '#ef4444', // rose-500
    weakThreshold: 50,
    weakTip:
      'Advanced Strategy: Break complex or multi-concept problems into smaller sub-goals before solving.',
  },
};

export function PersonalizedImprovement({
  topicBreakdown = [],
  categoryBreakdown = [],
  difficultyBreakdown = [],
  questionReview = [],
  title = 'Personalized Improvement & Performance Analysis',
  className,
}: PersonalizedImprovementProps) {
  // ── Normalize Category Breakdown ──
  const normalizedCategories: BreakdownItem[] = useMemo(() => {
    if (categoryBreakdown && categoryBreakdown.length > 0) {
      return categoryBreakdown
        .filter((item) => item.category && item.category.trim() !== '' && item.total > 0)
        .map((item) => ({
          name: item.category.trim(),
          total: item.total,
          correct: item.correct,
          accuracy: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
          totalTime: item.totalTime,
          points: item.points,
          earnedPoints: item.earnedPoints,
        }));
    }
    // Derive from questionReview without hardcoded fallbacks
    const map = new Map<string, { total: number; correct: number; totalTime: number }>();
    for (const qr of questionReview) {
      const cat = qr.questionCategory?.trim();
      if (!cat) continue;
      const curr = map.get(cat) ?? { total: 0, correct: 0, totalTime: 0 };
      curr.total += 1;
      if (qr.isCorrect === true) curr.correct += 1;
      curr.totalTime += qr.timeSpentSeconds ?? 0;
      map.set(cat, curr);
    }
    return Array.from(map.entries())
      .filter(([, stats]) => stats.total > 0)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        correct: stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        totalTime: stats.totalTime,
      }));
  }, [categoryBreakdown, questionReview]);

  // ── Normalize Difficulty Breakdown ──
  const normalizedDifficulties: BreakdownItem[] = useMemo(() => {
    const diffKeys: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    if (difficultyBreakdown && difficultyBreakdown.length > 0) {
      const existingMap = new Map(
        difficultyBreakdown
          .filter((d) => d.difficulty && d.total > 0)
          .map((d) => [d.difficulty.toLowerCase(), d]),
      );
      return diffKeys
        .map((key) => {
          const item = existingMap.get(key);
          if (!item || item.total === 0) return null;
          return {
            name: key,
            total: item.total,
            correct: item.correct,
            accuracy: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
            totalTime: item.totalTime,
            points: item.points,
            earnedPoints: item.earnedPoints,
          };
        })
        .filter(Boolean) as BreakdownItem[];
    }
    // Derive from questionReview without hardcoded fallbacks
    const map = new Map<string, { total: number; correct: number; totalTime: number }>();
    for (const qr of questionReview) {
      if (!qr.questionDifficulty) continue;
      const diff = qr.questionDifficulty.toLowerCase();
      const curr = map.get(diff) ?? { total: 0, correct: 0, totalTime: 0 };
      curr.total += 1;
      if (qr.isCorrect === true) curr.correct += 1;
      curr.totalTime += qr.timeSpentSeconds ?? 0;
      map.set(diff, curr);
    }
    return diffKeys
      .map((key) => {
        const stats = map.get(key);
        if (!stats || stats.total === 0) return null;
        return {
          name: key,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          totalTime: stats.totalTime,
        };
      })
      .filter(Boolean) as BreakdownItem[];
  }, [difficultyBreakdown, questionReview]);

  // ── Normalize Topics Breakdown ──
  const normalizedTopics: BreakdownItem[] = useMemo(() => {
    if (topicBreakdown && topicBreakdown.length > 0) {
      return topicBreakdown
        .filter((item) => item.topic && item.topic.trim() !== '' && item.total > 0)
        .map((item) => ({
          name: item.topic.trim(),
          total: item.total,
          correct: item.correct,
          accuracy: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
          totalTime: item.totalTime,
          points: item.points,
          earnedPoints: item.earnedPoints,
        }));
    }
    // Derive from questionReview without hardcoded fallbacks
    const map = new Map<string, { total: number; correct: number }>();
    for (const qr of questionReview) {
      const topic = qr.topic?.trim();
      if (!topic) continue;
      const curr = map.get(topic) ?? { total: 0, correct: 0 };
      curr.total += 1;
      if (qr.isCorrect === true) curr.correct += 1;
      map.set(topic, curr);
    }
    return Array.from(map.entries())
      .filter(([, stats]) => stats.total > 0)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        correct: stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }));
  }, [topicBreakdown, questionReview]);

  // ── Generate Specific Insights ──
  const weakCategories = useMemo(
    () => normalizedCategories.filter((c) => c.total > 0 && c.accuracy < 60),
    [normalizedCategories],
  );
  const strongCategories = useMemo(
    () => normalizedCategories.filter((c) => c.total > 0 && c.accuracy >= 75),
    [normalizedCategories],
  );

  const weakDifficulties = useMemo(
    () =>
      normalizedDifficulties.filter((d) => {
        const cfg = DIFFICULTY_CONFIG[d.name];
        const threshold = cfg?.weakThreshold ?? 60;
        return d.total > 0 && d.accuracy < threshold;
      }),
    [normalizedDifficulties],
  );

  const weakTopics = useMemo(
    () => normalizedTopics.filter((t) => t.total > 0 && t.accuracy < 60),
    [normalizedTopics],
  );

  const strongTopics = useMemo(
    () => normalizedTopics.filter((t) => t.total > 0 && t.accuracy >= 80),
    [normalizedTopics],
  );

  const hasData =
    normalizedCategories.length > 0 ||
    normalizedDifficulties.length > 0 ||
    normalizedTopics.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className={cn('space-y-4 rounded-xl border p-4 sm:p-5 bg-card/60', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
            <p className="text-[11px] text-muted-foreground">
              {[
                normalizedCategories.length > 0 && 'question types',
                normalizedDifficulties.length > 0 && 'difficulty levels',
                normalizedTopics.length > 0 && 'topic mastery',
              ]
                .filter(Boolean)
                .join(', ') + ' breakdown'}
            </p>
          </div>
        </div>
        {weakCategories.length === 0 && weakDifficulties.length === 0 && weakTopics.length === 0 ? (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] w-fit"
          >
            All-Round Strong Performance
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] w-fit"
          >
            Actionable Areas Identified
          </Badge>
        )}
      </div>

      {/* ── Graphs Grid ── */}
      {(normalizedCategories.length > 0 ||
        normalizedDifficulties.length > 0 ||
        (normalizedCategories.length === 0 &&
          normalizedDifficulties.length === 0 &&
          normalizedTopics.length > 0)) && (
        <div
          className={cn(
            'grid gap-4',
            normalizedCategories.length > 0 && normalizedDifficulties.length > 0
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1'
          )}
        >
          {/* 1. Question Type / Category Performance Chart */}
          {normalizedCategories.length > 0 && (
            <Card className="bg-background/80 border">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Brain className="size-3.5 text-primary" />
                    Question Type Performance (Accuracy %)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Benchmark: 70%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={normalizedCategories.map((c) => ({
                        category: formatCategoryName(c.name),
                        accuracy: c.accuracy,
                        correct: c.correct,
                        total: c.total,
                        missed: Math.max(0, c.total - c.correct),
                      }))}
                      margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                        width={38}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0 && payload[0]) {
                            const item = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-popover/95 p-2 shadow-md text-xs space-y-1">
                                <p className="font-semibold">{item.category} Questions</p>
                                <div className="text-[11px] space-y-0.5">
                                  <p className="flex justify-between gap-3 text-muted-foreground">
                                    <span>Accuracy:</span>
                                    <span className="font-semibold text-foreground">
                                      {item.accuracy}%
                                    </span>
                                  </p>
                                  <p className="flex justify-between gap-3 text-muted-foreground">
                                    <span>Questions:</span>
                                    <span>
                                      {item.correct} correct of {item.total}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                        {normalizedCategories.map((entry, index) => (
                          <Cell
                            key={`cat-cell-${index}`}
                            fill={
                              entry.accuracy >= 70
                                ? '#10b981'
                                : entry.accuracy >= 50
                                  ? '#f59e0b'
                                  : '#ef4444'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mt-2 border-t pt-2">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Strong (≥70%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-amber-500" />
                    Moderate (50-69%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-rose-500" />
                    Needs Work (&lt;50%)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. Difficulty Breakdown Chart */}
          {normalizedDifficulties.length > 0 && (
            <Card className="bg-background/80 border">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="size-3.5 text-primary" />
                    Performance by Difficulty Level
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Correct vs Missed
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={normalizedDifficulties.map((d) => ({
                        difficulty: d.name.charAt(0).toUpperCase() + d.name.slice(1),
                        correct: d.correct,
                        missed: Math.max(0, d.total - d.correct),
                        total: d.total,
                        accuracy: d.accuracy,
                      }))}
                      margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis
                        dataKey="difficulty"
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                        width={30}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0 && payload[0]) {
                            const item = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-popover/95 p-2 shadow-md text-xs space-y-1">
                                <p className="font-semibold">{item.difficulty} Questions</p>
                                <div className="text-[11px] space-y-0.5">
                                  <p className="flex justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                                    <span>Correct:</span>
                                    <span className="font-mono">{item.correct}</span>
                                  </p>
                                  <p className="flex justify-between gap-3 text-rose-500">
                                    <span>Missed:</span>
                                    <span className="font-mono">{item.missed}</span>
                                  </p>
                                  <p className="flex justify-between gap-3 text-muted-foreground pt-0.5 border-t">
                                    <span>Accuracy:</span>
                                    <span className="font-semibold">{item.accuracy}%</span>
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <RechartsLegend
                        wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                        iconSize={8}
                      />
                      <Bar
                        dataKey="correct"
                        name="Correct"
                        fill="#10b981"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="missed"
                        name="Missed"
                        fill="#ef4444"
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center mt-2 border-t pt-2">
                  {normalizedDifficulties.map((d) => (
                    <div key={d.name} className="rounded bg-muted/40 p-1">
                      <p className="text-[10px] text-muted-foreground capitalize">{d.name}</p>
                      <p className="text-xs font-bold font-mono">
                        {d.accuracy}%{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({d.correct}/{d.total})
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. Topic Mastery Chart when neither Category nor Difficulty is present */}
          {normalizedCategories.length === 0 &&
            normalizedDifficulties.length === 0 &&
            normalizedTopics.length > 0 && (
              <Card className="bg-background/80 border">
                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Target className="size-3.5 text-primary" />
                      Topic Mastery Performance (Accuracy %)
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Benchmark: 70%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="w-full h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={normalizedTopics.map((t) => ({
                          topic: t.name,
                          accuracy: t.accuracy,
                          correct: t.correct,
                          total: t.total,
                        }))}
                        margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                        <XAxis
                          dataKey="topic"
                          tick={{ fontSize: 10 }}
                          stroke="var(--muted-foreground)"
                        />
                        <YAxis
                          domain={[0, 100]}
                          unit="%"
                          tick={{ fontSize: 10 }}
                          stroke="var(--muted-foreground)"
                          width={38}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0 && payload[0]) {
                              const item = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-popover/95 p-2 shadow-md text-xs space-y-1">
                                  <p className="font-semibold">{item.topic}</p>
                                  <div className="text-[11px] space-y-0.5">
                                    <p className="flex justify-between gap-3 text-muted-foreground">
                                      <span>Accuracy:</span>
                                      <span className="font-semibold text-foreground">
                                        {item.accuracy}%
                                      </span>
                                    </p>
                                    <p className="flex justify-between gap-3 text-muted-foreground">
                                      <span>Questions:</span>
                                      <span>
                                        {item.correct} correct of {item.total}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                          {normalizedTopics.map((entry, index) => (
                            <Cell
                              key={`topic-cell-${index}`}
                              fill={
                                entry.accuracy >= 70
                                  ? '#10b981'
                                  : entry.accuracy >= 50
                                    ? '#f59e0b'
                                    : '#ef4444'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mt-2 border-t pt-2">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Strong (≥70%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Moderate (50-69%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-rose-500" />
                      Needs Work (&lt;50%)
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* ── Personalized Suggestions Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Priority Improvement Areas */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Target Areas for Improvement</span>
          </div>

          {weakCategories.length === 0 &&
          weakDifficulties.length === 0 &&
          weakTopics.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No critical weak areas detected! Maintain this momentum by practicing mixed test series.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {/* Weak Question Types / Categories */}
              {weakCategories.map((c) => {
                const advice = getCategoryAdvice(c.name);
                return (
                  <li key={`weak-cat-${c.name}`} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <span>{advice.icon}</span> {formatCategoryName(c.name)} questions ({c.accuracy}%)
                      </span>
                      <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">
                        {c.correct}/{c.total} correct
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {advice.weakTip}
                    </p>
                  </li>
                );
              })}

              {/* Weak Difficulties */}
              {weakDifficulties.map((d) => {
                const cfg = DIFFICULTY_CONFIG[d.name];
                return (
                  <li key={`weak-diff-${d.name}`} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize">
                        {d.name} difficulty questions ({d.accuracy}%)
                      </span>
                      <Badge variant="outline" className="text-[9px] border-rose-500/30 text-rose-600">
                        {d.correct}/{d.total} correct
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {cfg?.weakTip}
                    </p>
                  </li>
                );
              })}

              {/* Weak Topics */}
              {weakTopics.slice(0, 3).map((t) => (
                <li key={`weak-topic-${t.name}`} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      Topic: {t.name} ({t.accuracy}%)
                    </span>
                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">
                      {t.correct}/{t.total}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Prioritize reviewing the chapter notes and formula flashcards for {t.name}.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Demonstrated Strengths & Next Actions */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Key Strengths & Practice Plan</span>
          </div>

          <ul className="space-y-2 text-xs">
            {/* Strong Categories */}
            {strongCategories.map((c) => {
              const advice = getCategoryAdvice(c.name);
              return (
                <li key={`strong-cat-${c.name}`} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <span>{advice.icon}</span> {formatCategoryName(c.name)} Mastery ({c.accuracy}%)
                    </span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600">
                      High Accuracy
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {advice.strongTip}
                  </p>
                </li>
              );
            })}

            {/* Strong Topics */}
            {strongTopics.slice(0, 2).map((t) => (
              <li key={`strong-topic-${t.name}`} className="space-y-0.5">
                <span className="font-medium text-foreground">
                  Solid grasp in {t.name} ({t.accuracy}%)
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Excellent retention and problem-solving demonstrated on this subject.
                </p>
              </li>
            ))}

            {strongCategories.length === 0 && strongTopics.length === 0 && (
              <li className="space-y-0.5">
                <span className="font-medium text-foreground">Practice in Progress</span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Continue attempting practice sets to build consistency and unlock mastery benchmarks.
                </p>
              </li>
            )}

            {/* Actionable Next Step */}
            <li className="space-y-0.5 pt-1 border-t border-emerald-500/20">
              <span className="font-medium text-foreground flex items-center gap-1">
                <Lightbulb className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Recommended Next Step:
              </span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {weakCategories.length > 0
                  ? `Focus 60% of your next study session on ${weakCategories.map((c) => formatCategoryName(c.name)).join(' & ')} practice questions before re-attempting this assessment.`
                  : weakTopics.length > 0
                    ? `Focus your next study session on reviewing ${weakTopics.map((t) => t.name).join(' & ')} before re-attempting this assessment.`
                    : 'Take a timed full-length mock assessment to test endurance and time management under exam conditions.'}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
