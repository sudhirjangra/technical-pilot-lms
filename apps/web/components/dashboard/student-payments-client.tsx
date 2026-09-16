'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { StudentPayment } from '@/server/student/payments.server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Input } from '@repo/shadcn/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import {
  CreditCard,
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  ExternalLink,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
} from '@repo/shadcn/lucide';
import { APP_NAME } from '@repo/constants/app';

interface StudentPaymentsClientProps {
  initialPayments: StudentPayment[];
  user: {
    email?: string | null;
    full_name?: string | null;
  };
}

export function StudentPaymentsClient({
  initialPayments,
  user,
}: StudentPaymentsClientProps) {
  const [payments] = useState<StudentPayment[]>(initialPayments);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<StudentPayment | null>(null);

  const filtered = payments.filter((p) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const courseTitle = p.courses?.title?.toLowerCase() ?? '';
    const invoice = p.invoice_number?.toLowerCase() ?? '';
    const orderId = p.razorpay_order_id?.toLowerCase() ?? '';
    const paymentId = p.razorpay_payment_id?.toLowerCase() ?? '';
    return (
      courseTitle.includes(term) ||
      invoice.includes(term) ||
      orderId.includes(term) ||
      paymentId.includes(term)
    );
  });

  const totalSpent = payments
    .filter((p) => p.status === 'captured' || p.status === 'paid' || p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const successfulCount = payments.filter(
    (p) => p.status === 'captured' || p.status === 'paid' || p.status === 'completed',
  ).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container max-w-7xl px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Receipt className="size-6 sm:size-8 text-primary" />
            Payment History & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review all your course purchase receipts, order references, and tax invoices.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 self-start sm:self-auto">
          <Link href="/courses">
            <BookOpen className="size-4" />
            Browse More Courses
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight">
                ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Invested in Learning</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight">
                {successfulCount}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Successful Transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400 shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight">
                100% Secure
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Verified via Razorpay</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Section */}
      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Transactions & Invoices</CardTitle>
            <CardDescription className="text-xs">
              All transactions processed for your account
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search course, invoice, order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {search ? 'No payments matching your search.' : 'No payment records found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/20">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Order / Reference</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => {
                    const isSuccess =
                      p.status === 'captured' ||
                      p.status === 'paid' ||
                      p.status === 'completed';
                    const isPending = p.status === 'created' || p.status === 'pending';

                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 max-w-xs sm:max-w-sm">
                            {p.courses?.thumbnail_url ? (
                              <Image
                                src={p.courses.thumbnail_url}
                                alt={p.courses.title}
                                width={36}
                                height={24}
                                className="rounded object-cover h-6 w-9 shrink-0 border"
                              />
                            ) : (
                              <div className="h-6 w-9 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <BookOpen className="size-3.5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {p.courses?.title ?? 'Course Enrollment'}
                              </p>
                              {p.courses?.slug && (
                                <Link
                                  href={`/courses/${p.courses.slug}`}
                                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                  Course Details <ArrowUpRight className="size-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                          {p.invoice_number ?? '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                          <span title={p.razorpay_order_id ?? ''}>
                            {p.razorpay_order_id
                              ? p.razorpay_order_id.length > 14
                                ? `${p.razorpay_order_id.slice(0, 14)}...`
                                : p.razorpay_order_id
                              : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground whitespace-nowrap">
                          ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isSuccess && (
                            <Badge
                              variant="default"
                              className="bg-emerald-600 text-white text-[10px] gap-1"
                            >
                              <CheckCircle2 className="size-3" />
                              Paid
                            </Badge>
                          )}
                          {isPending && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1"
                            >
                              <Clock className="size-3" />
                              Pending
                            </Badge>
                          )}
                          {!isSuccess && !isPending && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertCircle className="size-3" />
                              {p.status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => setSelectedPayment(p)}
                          >
                            <Receipt className="size-3" />
                            View Receipt
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice / Receipt Modal */}
      <Dialog
        open={!!selectedPayment}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null);
        }}
      >
        <DialogContent className="max-w-lg p-5 sm:p-6 print:m-0 print:p-0 print:border-none print:shadow-none">
          {selectedPayment && (
            <div className="space-y-4" id="printable-receipt">
              <DialogHeader className="border-b pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      TP
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold">{APP_NAME}</DialogTitle>
                      <DialogDescription className="text-xs">
                        Official Payment Receipt & Tax Invoice
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge
                    variant="default"
                    className="bg-emerald-600 text-white text-[10px] uppercase tracking-wider"
                  >
                    Paid
                  </Badge>
                </div>
              </DialogHeader>

              {/* Invoice Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Invoice Number</span>
                  <span className="font-mono font-semibold">{selectedPayment.invoice_number ?? 'N/A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px]">Date of Purchase</span>
                  <span className="font-medium">
                    {new Date(selectedPayment.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Billed To</span>
                  <span className="font-medium text-foreground">
                    {user.full_name || user.email || 'Enrolled Student'}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{user.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px]">Payment Provider</span>
                  <span className="font-medium">Razorpay PG (INR)</span>
                  {selectedPayment.razorpay_payment_id && (
                    <span className="block font-mono text-[10px] text-muted-foreground truncate max-w-[150px] ml-auto">
                      ID: {selectedPayment.razorpay_payment_id}
                    </span>
                  )}
                </div>
              </div>

              {/* Itemized list */}
              <div className="space-y-2 border-b pb-3">
                <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex items-start justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {selectedPayment.courses?.title ?? 'Course Access License'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Order Reference: {selectedPayment.razorpay_order_id ?? 'Direct Order'}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    ₹{Number(selectedPayment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Total & Summary */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{Number(selectedPayment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes (GST Inclusive)</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground border-t pt-2">
                  <span>Total Paid</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ₹{Number(selectedPayment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground text-center">
                This is a computer-generated receipt for Technical Pilot LMS enrollment. For queries, contact support@technicalpilot.com.
              </div>

              <DialogFooter className="flex-row justify-between sm:justify-between items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handlePrint}
                >
                  <Printer className="size-3.5" />
                  Print / Save PDF
                </Button>
                {selectedPayment.courses?.slug && (
                  <Button size="sm" className="h-8 text-xs gap-1.5" asChild>
                    <Link href={`/dashboard/courses/${selectedPayment.course_id}`}>
                      <ExternalLink className="size-3.5" />
                      Go to Course
                    </Link>
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
