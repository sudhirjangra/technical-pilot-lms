'use client';

import { refundPayment } from '@/server/admin/payments.server';
import { Payment } from '@/server/admin/payments.types';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Loader2,
  Mail,
  Phone,
  Printer,
  RotateCcw,
  ShieldAlert,
  User,
  XCircle,
} from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import { useState } from 'react';

interface PaymentDetailDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentUpdated?: () => void;
}

export function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
      return (
        <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="size-3" />
          <span>Completed</span>
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="gap-1 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30">
          <Clock className="size-3" />
          <span>Pending</span>
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="gap-1 bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/30">
          <XCircle className="size-3" />
          <span>Failed</span>
        </Badge>
      );
    case 'refunded':
      return (
        <Badge className="gap-1 bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/30">
          <RotateCcw className="size-3" />
          <span>Refunded</span>
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function PaymentDetailDialog({
  payment,
  open,
  onOpenChange,
  onPaymentUpdated,
}: PaymentDetailDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<string>('');

  if (!payment) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleRefundSubmit = async () => {
    if (!refundReason.trim()) {
      toast.error('Please specify a refund reason');
      return;
    }

    const amt = refundAmount ? Number(refundAmount) : Number(payment.amount);
    if (isNaN(amt) || amt <= 0 || amt > Number(payment.amount)) {
      toast.error(`Refund amount must be between ₹1 and ₹${payment.amount}`);
      return;
    }

    setIsRefunding(true);
    try {
      const res = await refundPayment(payment.id, {
        reason: refundReason.trim(),
        amount: amt,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || 'Payment refunded successfully');
        setShowRefundConfirm(false);
        onOpenChange(false);
        if (onPaymentUpdated) onPaymentUpdated();
      }
    } catch {
      toast.error('Unexpected error processing refund');
    } finally {
      setIsRefunding(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Allow popups to print receipt.');
      return;
    }

    const formattedDate = new Date(payment.created_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${payment.invoice_number || payment.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
          .receipt-box { max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
          .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
          .logo { font-size: 22px; font-weight: bold; color: #0f172a; }
          .title { font-size: 14px; color: #64748b; margin-top: 4px; }
          .amount-box { text-align: center; margin: 24px 0; padding: 18px; background: #f8fafc; border-radius: 8px; }
          .amount-val { font-size: 32px; font-weight: bold; color: #0f172a; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #dcfce7; color: #15803d; }
          .details { margin-top: 24px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .label { color: #64748b; }
          .value { font-weight: 500; color: #0f172a; text-align: right; }
          .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <div class="logo">Technical Pilot LMS</div>
            <div class="title">Payment Receipt / Tax Invoice</div>
          </div>
          <div class="amount-box">
            <div class="status">${payment.status}</div>
            <div class="amount-val">₹${Number(payment.amount).toLocaleString('en-IN')}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Invoice: ${payment.invoice_number || 'N/A'}</div>
          </div>
          <div class="details">
            <div class="row"><span class="label">Date & Time</span><span class="value">${formattedDate}</span></div>
            <div class="row"><span class="label">Student Name</span><span class="value">${payment.profiles?.full_name || 'N/A'}</span></div>
            <div class="row"><span class="label">Student Email</span><span class="value">${payment.profiles?.email || 'N/A'}</span></div>
            <div class="row"><span class="label">Course</span><span class="value">${payment.courses?.title || 'N/A'}</span></div>
            <div class="row"><span class="label">Base Price</span><span class="value">₹${payment.courses?.price || payment.amount}</span></div>
            ${
              payment.discount_amount
                ? `<div class="row"><span class="label">Discount Applied</span><span class="value">-₹${payment.discount_amount}</span></div>`
                : ''
            }
            <div class="row"><span class="label">Razorpay Order ID</span><span class="value">${payment.razorpay_order_id || 'N/A'}</span></div>
            <div class="row"><span class="label">Razorpay Payment ID</span><span class="value">${payment.razorpay_payment_id || 'N/A'}</span></div>
            ${
              payment.refund_reason
                ? `<div class="row"><span class="label">Refund Reason</span><span class="value">${payment.refund_reason}</span></div>`
                : ''
            }
          </div>
          <div class="footer">
            Thank you for learning with Technical Pilot LMS.<br/>
            Computer-generated receipt, no signature required.
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const createdDate = new Date(payment.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const studentName = payment.profiles?.full_name || 'Anonymous Student';
  const studentEmail = payment.profiles?.email || 'No email provided';
  const studentPhone = payment.profiles?.phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-lg font-bold sm:text-xl flex items-center gap-2">
                <span>Payment Details</span>
                {getStatusBadge(payment.status)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Invoice {payment.invoice_number || payment.id} • {createdDate}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReceipt}
              className="gap-1.5 h-8 text-xs font-medium"
            >
              <Printer className="size-3.5" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount and Discount Highlights Banner */}
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-muted/40 p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Amount Paid
                </span>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  ₹{Number(payment.amount).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  List Price
                </span>
                <p className="text-lg font-semibold text-muted-foreground mt-1">
                  ₹{Number(payment.courses?.price || payment.amount).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Discount
                </span>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {payment.discount_amount && payment.discount_amount > 0
                    ? `₹${Number(payment.discount_amount).toLocaleString('en-IN')}`
                    : '₹0'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Gateway
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-semibold text-sm">
                  <CreditCard className="size-4 text-sky-500" />
                  <span>Razorpay</span>
                </div>
              </div>
            </div>
          </div>

          {/* Refund Notice (if refunded) */}
          {payment.status === 'refunded' && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs text-purple-700 dark:text-purple-300">
              <div className="flex items-start gap-2">
                <RotateCcw className="size-4 mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Payment was refunded</p>
                  <p className="text-muted-foreground">
                    Reason: {payment.refund_reason || 'Administrative refund processed'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Student & Course Cards Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Student Info */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5" />
                  Student Information
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{studentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{studentEmail}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs">
                {studentPhone && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" /> Phone
                    </span>
                    <span className="font-mono text-foreground">{studentPhone}</span>
                  </div>
                )}
                {payment.student_id && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>User ID</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payment.student_id!, 'User ID')}
                      className="font-mono text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <span>{payment.student_id.slice(0, 8)}...</span>
                      <Copy className="size-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Course Info */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" />
                  Purchased Course
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
                  <BookOpen className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {payment.courses?.title || 'Unknown Course'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Slug: {payment.courses?.slug || 'n/a'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Course ID</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(payment.course_id || '', 'Course ID')}
                    className="font-mono text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <span>{(payment.course_id || '').slice(0, 8)}...</span>
                    <Copy className="size-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Transaction & Gateway IDs */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="size-3.5" />
              Gateway & Transaction Identifiers
            </span>

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 text-xs">
              {/* Razorpay Payment ID */}
              <div className="flex items-center justify-between rounded-lg bg-background/60 p-2 border border-border/40">
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block">Payment ID</span>
                  <span className="font-mono text-xs font-medium truncate block">
                    {payment.razorpay_payment_id || 'Not generated yet'}
                  </span>
                </div>
                {payment.razorpay_payment_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      copyToClipboard(payment.razorpay_payment_id!, 'Payment ID')
                    }
                  >
                    {copiedField === 'Payment ID' ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                )}
              </div>

              {/* Razorpay Order ID */}
              <div className="flex items-center justify-between rounded-lg bg-background/60 p-2 border border-border/40">
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block">Order ID</span>
                  <span className="font-mono text-xs font-medium truncate block">
                    {payment.razorpay_order_id || 'N/A'}
                  </span>
                </div>
                {payment.razorpay_order_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      copyToClipboard(payment.razorpay_order_id!, 'Order ID')
                    }
                  >
                    {copiedField === 'Order ID' ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                )}
              </div>

              {/* Invoice Number */}
              <div className="flex items-center justify-between rounded-lg bg-background/60 p-2 border border-border/40">
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block">Invoice Number</span>
                  <span className="font-mono text-xs font-medium truncate block">
                    {payment.invoice_number || 'N/A'}
                  </span>
                </div>
                {payment.invoice_number && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      copyToClipboard(payment.invoice_number!, 'Invoice Number')
                    }
                  >
                    {copiedField === 'Invoice Number' ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                )}
              </div>

              {/* Internal Payment ID */}
              <div className="flex items-center justify-between rounded-lg bg-background/60 p-2 border border-border/40">
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block">Record UUID</span>
                  <span className="font-mono text-xs font-medium truncate block">
                    {payment.id}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => copyToClipboard(payment.id, 'Record ID')}
                >
                  {copiedField === 'Record ID' ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Refund Manager Section (if completed) */}
          {payment.status === 'completed' && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5" />
                    Process Payment Refund
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Issuing a refund will return funds to the student and expire their course enrollment.
                  </p>
                </div>
                {!showRefundConfirm && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs gap-1.5 font-medium"
                    onClick={() => {
                      setRefundAmount(String(payment.amount));
                      setShowRefundConfirm(true);
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Issue Refund</span>
                  </Button>
                )}
              </div>

              {showRefundConfirm && (
                <div className="rounded-lg border border-rose-500/30 bg-background/80 p-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Refund Amount (₹)</Label>
                      <Input
                        type="number"
                        min="1"
                        max={payment.amount}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="h-9 text-xs mt-1"
                        placeholder={`Max ₹${payment.amount}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Reason for Refund</Label>
                      <Input
                        type="text"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        className="h-9 text-xs mt-1"
                        placeholder="e.g., Requested by student, duplicate charge"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowRefundConfirm(false)}
                      disabled={isRefunding}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleRefundSubmit}
                      disabled={isRefunding}
                    >
                      {isRefunding ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3" />
                          <span>Confirm & Refund ₹{refundAmount || payment.amount}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
