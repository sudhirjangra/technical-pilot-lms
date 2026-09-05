'use client';

import { Payment } from '@/server/admin/payments.types';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  IndianRupee,
  RotateCcw,
  TrendingUp,
  Wallet,
} from '@repo/shadcn/lucide';
import { cn } from '@repo/shadcn/lib/utils';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PaymentsAnalyticsProps {
  payments: Payment[];
  filteredPayments: Payment[];
}

type Timeframe = 'daily' | 'weekly' | 'monthly';

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981', // emerald-500
  pending: '#f59e0b', // amber-500
  failed: '#ef4444', // red-500
  refunded: '#8b5cf6', // purple-500
};

export function PaymentsAnalytics({
  payments,
  filteredPayments,
}: PaymentsAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<'trend' | 'courses' | 'status'>('trend');

  // KPI Calculations across all payments
  const metrics = useMemo(() => {
    let completedRevenue = 0;
    let refundedRevenue = 0;
    let pendingRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let refundedCount = 0;

    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      if (p.status === 'completed') {
        completedRevenue += amt;
        completedCount++;
      } else if (p.status === 'refunded') {
        refundedRevenue += amt;
        refundedCount++;
      } else if (p.status === 'pending') {
        pendingRevenue += amt;
        pendingCount++;
      } else if (p.status === 'failed') {
        failedCount++;
      }
    }

    const netRevenue = completedRevenue - refundedRevenue;
    const attemptedCount = completedCount + failedCount + refundedCount;
    const successRate = attemptedCount > 0 ? (completedCount / attemptedCount) * 100 : 0;
    const averageOrderValue = completedCount > 0 ? Math.round(completedRevenue / completedCount) : 0;

    return {
      completedRevenue,
      netRevenue,
      refundedRevenue,
      pendingRevenue,
      completedCount,
      pendingCount,
      failedCount,
      refundedCount,
      totalCount: payments.length,
      successRate,
      averageOrderValue,
    };
  }, [payments]);

  // Filtered metrics for current view
  const filteredMetrics = useMemo(() => {
    let revenue = 0;
    let count = 0;
    for (const p of filteredPayments) {
      if (p.status === 'completed') {
        revenue += Number(p.amount) || 0;
        count++;
      }
    }
    return { revenue, count };
  }, [filteredPayments]);

  // Trend data grouped by date
  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; transactions: number; completed: number; failed: number }>();

    // Sort ascending for chronology
    const sorted = [...payments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    for (const p of sorted) {
      const dateObj = new Date(p.created_at);
      let key = '';

      if (timeframe === 'monthly') {
        key = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (timeframe === 'weekly') {
        const d = new Date(dateObj);
        const day = d.getDay();
        const diff = d.getDate() - day;
        d.setDate(diff);
        key = `Wk ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        key = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      const existing = map.get(key) || {
        date: key,
        revenue: 0,
        transactions: 0,
        completed: 0,
        failed: 0,
      };

      existing.transactions += 1;
      if (p.status === 'completed') {
        existing.revenue += Number(p.amount) || 0;
        existing.completed += 1;
      } else if (p.status === 'failed') {
        existing.failed += 1;
      }

      map.set(key, existing);
    }

    return Array.from(map.values()).slice(-20);
  }, [payments, timeframe]);

  // Course revenue breakdown
  const courseData = useMemo(() => {
    const courseMap = new Map<string, { name: string; revenue: number; count: number }>();

    for (const p of payments) {
      if (p.status === 'completed') {
        const title = p.courses?.title || 'Unknown Course';
        const amt = Number(p.amount) || 0;
        const existing = courseMap.get(title) || { name: title, revenue: 0, count: 0 };
        existing.revenue += amt;
        existing.count += 1;
        courseMap.set(title, existing);
      }
    }

    return Array.from(courseMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((c) => ({
        ...c,
        displayName: c.name.length > 22 ? `${c.name.slice(0, 22)}...` : c.name,
      }));
  }, [payments]);

  // Status breakdown data
  const statusData = useMemo(() => {
    return [
      {
        status: 'Completed',
        key: 'completed',
        count: metrics.completedCount,
        amount: metrics.completedRevenue,
        color: STATUS_COLORS.completed,
      },
      {
        status: 'Pending',
        key: 'pending',
        count: metrics.pendingCount,
        amount: metrics.pendingRevenue,
        color: STATUS_COLORS.pending,
      },
      {
        status: 'Refunded',
        key: 'refunded',
        count: metrics.refundedCount,
        amount: metrics.refundedRevenue,
        color: STATUS_COLORS.refunded,
      },
      {
        status: 'Failed',
        key: 'failed',
        count: metrics.failedCount,
        amount: 0,
        color: STATUS_COLORS.failed,
      },
    ];
  }, [metrics]);

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
        {/* Gross Revenue */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] sm:text-xs font-medium truncate">Gross Revenue</span>
              <div className="rounded-full bg-emerald-500/10 p-1 sm:p-1.5 text-emerald-500 shrink-0">
                <IndianRupee className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-base font-bold sm:text-xl">
                ₹{metrics.completedRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-[11px]">
              {metrics.completedCount} completed
            </p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] sm:text-xs font-medium truncate">Net Revenue</span>
              <div className="rounded-full bg-sky-500/10 p-1 sm:p-1.5 text-sky-500 shrink-0">
                <Wallet className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-base font-bold sm:text-xl">
                ₹{metrics.netRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-[11px]">
              After ₹{metrics.refundedRevenue.toLocaleString('en-IN')} refunds
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] sm:text-xs font-medium truncate">Success Rate</span>
              <div className="rounded-full bg-indigo-500/10 p-1 sm:p-1.5 text-indigo-500 shrink-0">
                <TrendingUp className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-base font-bold sm:text-xl">
                {metrics.successRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-[11px]">
              {metrics.completedCount} of {metrics.completedCount + metrics.failedCount + metrics.refundedCount}
            </p>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] sm:text-xs font-medium truncate">Avg. Order Value</span>
              <div className="rounded-full bg-purple-500/10 p-1 sm:p-1.5 text-purple-500 shrink-0">
                <CircleDollarSign className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-base font-bold sm:text-xl">
                ₹{metrics.averageOrderValue.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-[11px]">Per order</p>
          </CardContent>
        </Card>

        {/* Pending Volume */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] sm:text-xs font-medium truncate">Pending Orders</span>
              <div className="rounded-full bg-amber-500/10 p-1 sm:p-1.5 text-amber-500 shrink-0">
                <Clock className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-base font-bold sm:text-xl">
                ₹{metrics.pendingRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-[11px]">
              {metrics.pendingCount} awaiting
            </p>
          </CardContent>
        </Card>

        {/* Refunds */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] sm:text-xs font-medium truncate">Refunds</span>
              <div className="rounded-full bg-rose-500/10 p-1 sm:p-1.5 text-rose-500 shrink-0">
                <RotateCcw className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1">
              <span className="text-base font-bold sm:text-xl">
                ₹{metrics.refundedRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-[11px]">
              {metrics.refundedCount} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Panel Toggle & Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2 text-xs"
          >
            <BarChart3 className="size-3.5" />
            <span>Revenue Analytics & Charts</span>
            {isExpanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
          {filteredPayments.length !== payments.length && (
            <Badge variant="outline" className="text-[11px]">
              Filtered: ₹{filteredMetrics.revenue.toLocaleString('en-IN')} ({filteredMetrics.count} orders)
            </Badge>
          )}
        </div>

        {isExpanded && (
          <div className="flex items-center gap-1.5">
            {/* Chart Tab Switcher */}
            <div className="bg-muted/70 flex rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveChartTab('trend')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeChartTab === 'trend'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Revenue Trend
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('courses')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeChartTab === 'courses'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                By Course
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('status')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeChartTab === 'status'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Status Split
              </button>
            </div>

            {/* Timeframe selector (only for trend) */}
            {activeChartTab === 'trend' && (
              <div className="bg-muted/70 hidden sm:flex rounded-lg p-0.5 text-xs">
                {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      'capitalize rounded-md px-2 py-1 transition-colors',
                      timeframe === t
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Chart View */}
      {isExpanded && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-6">
            <div>
              <CardTitle className="text-sm font-semibold sm:text-base">
                {activeChartTab === 'trend' && 'Revenue & Sales Trajectory'}
                {activeChartTab === 'courses' && 'Revenue Distribution by Course'}
                {activeChartTab === 'status' && 'Payment Status Breakdown'}
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                {activeChartTab === 'trend' &&
                  `Visualizing collections in ₹ and volume across ${timeframe} intervals`}
                {activeChartTab === 'courses' &&
                  'Top earning published courses by completed purchases'}
                {activeChartTab === 'status' &&
                  'Comparison of transaction volumes and amounts across payment lifecycle'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-2 pt-2 pb-4 sm:px-6">
            {activeChartTab === 'trend' && (
              <div className="h-[280px] w-full sm:h-[320px]">
                {trendData.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground text-xs">No payment data recorded yet.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendData}
                      margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(150, 150, 150, 0.15)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          backdropFilter: 'blur(8px)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                          color: '#fff',
                        }}
                        formatter={(val: any, name: any) => [
                          name === 'revenue' ? `₹${Number(val).toLocaleString('en-IN')}` : val,
                          name === 'revenue' ? 'Revenue' : 'Transactions',
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#revenueGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="transactions"
                        name="Orders"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="none"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {activeChartTab === 'courses' && (
              <div className="h-[280px] w-full sm:h-[320px]">
                {courseData.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground text-xs">No course revenue recorded yet.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={courseData}
                      margin={{ top: 10, right: 12, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(150, 150, 150, 0.15)"
                      />
                      <XAxis
                        dataKey="displayName"
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          backdropFilter: 'blur(8px)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                          color: '#fff',
                        }}
                        formatter={(val: any, name: any) => [
                          name === 'revenue'
                            ? `₹${Number(val).toLocaleString('en-IN')}`
                            : `${val} orders`,
                          name === 'revenue' ? 'Revenue' : 'Orders',
                        ]}
                      />
                      <Bar
                        dataKey="revenue"
                        name="revenue"
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                      >
                        {courseData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#10b981' : '#3b82f6'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {activeChartTab === 'status' && (
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
                {statusData.map((item) => {
                  const pct =
                    metrics.totalCount > 0
                      ? ((item.count / metrics.totalCount) * 100).toFixed(1)
                      : '0';

                  return (
                    <div
                      key={item.key}
                      className="border-border/60 bg-background/50 flex flex-col justify-between rounded-xl border p-4 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-semibold">{item.status}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {pct}%
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-2xl font-bold">{item.count}</span>
                          <span className="text-muted-foreground text-xs">orders</span>
                        </div>
                      </div>

                      <div className="border-border/40 mt-3 border-t pt-2">
                        <span className="text-muted-foreground text-[11px]">Total volume</span>
                        <p className="text-sm font-semibold">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
