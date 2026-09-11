'use client';

import {
  getMyReferralSummary,
  ReferralSummary,
  requestCashConversion,
} from '@/server/student/referrals.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { toast } from '@repo/shadcn/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import { Textarea } from '@repo/shadcn/textarea';
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Check,
  Clock,
  Copy,
  Gift,
  HelpCircle,
  History,
  Send,
  Share2,
  Users,
  Wallet,
} from '@repo/shadcn/lucide';
import { useEffect, useState } from 'react';

export function ReferralsClient({ initialData }: { initialData?: ReferralSummary | null }) {
  const [data, setData] = useState<ReferralSummary | null>(initialData ?? null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [origin, setOrigin] = useState('');

  // Conversion dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pointsToConvert, setPointsToConvert] = useState<number>(0);
  const [conversionNotes, setConversionNotes] = useState('');
  const [submittingConversion, setSubmittingConversion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const referralCode = data?.referral_code || '';
  const wallet = data?.wallet;
  const settings = data?.settings;
  const shareUrl = `${origin}/auth/sign-up?ref=${referralCode}`;

  useEffect(() => {
    if (wallet && wallet.current_balance > 0) {
      setPointsToConvert(wallet.current_balance);
    }
  }, [wallet]);

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success('Referral code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join Technical Pilot LMS using my referral code ${referralCode} to get ${settings?.referee_discount_percentage || 20}% off on flight courses!\n\nSign up here: ${shareUrl}`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleConversionSubmit = async () => {
    if (!wallet || !settings) return;
    if (pointsToConvert < settings.min_withdrawal_points) {
      toast.error(`Minimum conversion is ${settings.min_withdrawal_points} points.`);
      return;
    }
    if (pointsToConvert > wallet.current_balance) {
      toast.error(`You only have ${wallet.current_balance} points available.`);
      return;
    }

    setSubmittingConversion(true);
    const res = await requestCashConversion({
      points: pointsToConvert,
      notes: conversionNotes,
    });
    setSubmittingConversion(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(
      'Conversion requested! Technical Pilot team will contact your email to transfer funds.',
    );
    setDialogOpen(false);
    setConversionNotes('');

    // Refresh summary
    const refreshed = await getMyReferralSummary();
    if (refreshed.data) {
      setData(refreshed.data);
    }
  };

  const pointsRatio = settings?.points_per_rupee || 5;
  const estimatedInr = (pointsToConvert / pointsRatio).toFixed(2);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary">
              <Gift className="size-3.5" />
              Technical Pilot Rewards Program
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Refer & Earn Credit Points
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Invite your pilot peers. When they sign up with your code, they get an exclusive{' '}
              <strong className="text-foreground">{settings?.referee_discount_percentage || 20}% discount</strong> on courses.
              When they enroll, you receive{' '}
              <strong className="text-foreground">{settings?.referrer_reward_percentage || 10}% reward points</strong> in your wallet!
            </p>
          </div>

          {/* Quick wallet pill */}
          <div className="bg-card/80 border border-border p-4 rounded-xl shadow-xs min-w-[200px] flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Wallet className="size-3.5 text-primary" />
              Available Balance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {(wallet?.current_balance || 0).toLocaleString()}
              </span>
              <span className="text-xs font-medium text-muted-foreground">pts</span>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              ≈ ₹{((wallet?.current_balance || 0) / pointsRatio).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Available Referral Welcome Coupon (for students who signed up via referral) */}
      {data?.available_coupon && (
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-card p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                <Gift className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-base">Your Welcome Referral Discount Coupon</span>
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                    {data.available_coupon.discount_percentage}% OFF
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  You gained an exclusive {data.available_coupon.discount_percentage}% discount for joining through a friend&apos;s referral! Apply this code during checkout on any course.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <div className="px-3.5 py-2 rounded-lg bg-background border border-emerald-500/30 font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 text-sm">
                {data.available_coupon.code}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => {
                  navigator.clipboard.writeText(data.available_coupon!.code);
                  setCopiedCoupon(true);
                  toast.success('Coupon code copied to clipboard!');
                  setTimeout(() => setCopiedCoupon(false), 2000);
                }}
              >
                {copiedCoupon ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copiedCoupon ? 'Copied' : 'Copy Code'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share & Wallet Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Referral Code Share Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="size-4 text-primary" />
              Your Unique Referral Code
            </CardTitle>
            <CardDescription className="text-xs">
              Give this code or link to friends during registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Code Display */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/80 bg-muted/40">
              <span className="font-mono text-xl font-bold tracking-widest text-primary">
                {referralCode || 'Generating...'}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium"
                onClick={handleCopyCode}
                disabled={!referralCode}
              >
                {copiedCode ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </Button>
            </div>

            {/* Share Link */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Direct Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="h-9 text-xs font-mono bg-muted/30"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 px-3 shrink-0 text-xs"
                  onClick={handleCopyLink}
                  disabled={!referralCode}
                >
                  {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>

            {/* Share actions */}
            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1.5 border-emerald-600/30 text-emerald-600 hover:bg-emerald-500/10"
                onClick={handleShareWhatsApp}
                disabled={!referralCode}
              >
                <Send className="size-3.5" />
                Share on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Credit Wallet & Conversion Card */}
        <Card className="border-border flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Banknote className="size-4 text-emerald-600" />
                  Credit Wallet & Cash Conversion
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-normal">
                  {pointsRatio} Points = ₹1.00
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Convert credit points into bank funds transferred manually by Technical Pilot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[11px] text-muted-foreground block">Total Points Earned</span>
                  <span className="text-lg font-bold text-foreground">
                    {(wallet?.total_earned || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[11px] text-muted-foreground block">Points Converted</span>
                  <span className="text-lg font-bold text-foreground">
                    {(wallet?.total_redeemed || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                <HelpCircle className="size-4 shrink-0 text-primary mt-0.5" />
                <span>
                  Minimum conversion is{' '}
                  <strong className="text-foreground">{settings?.min_withdrawal_points || 500} points</strong> (~₹
                  {((settings?.min_withdrawal_points || 500) / pointsRatio).toFixed(0)}).
                  Technical Pilot will examine the credits and contact you at your registered email to request your bank account details.
                </span>
              </div>
            </CardContent>
          </div>

          <div className="p-6 pt-0">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="default"
                  className="w-full gap-2 font-medium"
                  disabled={(wallet?.current_balance || 0) < (settings?.min_withdrawal_points || 500)}
                >
                  <ArrowUpRight className="size-4" />
                  Request Cash Conversion
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Banknote className="size-5 text-emerald-600" />
                    Convert Points to Real Money
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Current Rate: {pointsRatio} Points = ₹1.00 INR.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <Label htmlFor="points">Points to Convert</Label>
                      <span className="text-muted-foreground">
                        Available: {(wallet?.current_balance || 0).toLocaleString()} pts
                      </span>
                    </div>
                    <Input
                      id="points"
                      type="number"
                      min={settings?.min_withdrawal_points || 500}
                      max={wallet?.current_balance || 0}
                      value={pointsToConvert}
                      onChange={(e) => setPointsToConvert(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex justify-between items-center">
                    <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      Estimated Bank Transfer
                    </span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{estimatedInr} INR
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs">
                      Bank Transfer Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="e.g. Preferred bank, UPI ID, or special instructions"
                      rows={2}
                      className="text-xs"
                      value={conversionNotes}
                      onChange={(e) => setConversionNotes(e.target.value)}
                    />
                  </div>

                  <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
                    <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Direct Bank Transfer Process:</p>
                      <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                        The Technical Pilot team will verify the referral credits, reach out to your registered email to confirm bank details, and transfer the money manually.
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submittingConversion}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConversionSubmit}
                    disabled={
                      submittingConversion ||
                      pointsToConvert < (settings?.min_withdrawal_points || 500) ||
                      pointsToConvert > (wallet?.current_balance || 0)
                    }
                  >
                    {submittingConversion ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </div>

      {/* Tables Tabs: Referred Friends & Payout History */}
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
          <TabsTrigger value="friends" className="gap-1.5 text-xs">
            <Users className="size-3.5" />
            Referred Friends ({data?.referred_users.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="size-3.5" />
            Conversion History
          </TabsTrigger>
        </TabsList>

        {/* Referred Friends Tab */}
        <TabsContent value="friends">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Your Referred Friends</CardTitle>
              <CardDescription className="text-xs">
                See which friends enrolled and the points you earned from their purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.referred_users || data.referred_users.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <Users className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No referrals yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Share your referral code ({referralCode}) with other students. You will see their enrollment status and your earned points here!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/20">
                      <tr>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Date Joined</th>
                        <th className="py-2.5 px-3">Purchase Status</th>
                        <th className="py-2.5 px-3 text-right">Amount Purchased</th>
                        <th className="py-2.5 px-3 text-right">Points Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.referred_users.map((friend) => (
                        <tr key={friend.id} className="hover:bg-muted/30">
                          <td className="py-3 px-3">
                            <div className="font-medium text-foreground">{friend.name}</div>
                            <div className="text-[11px] text-muted-foreground">{friend.email}</div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {new Date(friend.joined_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            {friend.has_purchased ? (
                              <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                                Purchased ({friend.total_purchases_count})
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Registered (No purchase yet)
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-foreground">
                            {friend.total_purchased_amount > 0 ? `₹${friend.total_purchased_amount.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {friend.points_earned > 0 ? `+${friend.points_earned.toLocaleString()} pts` : '0 pts'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversion History Tab */}
        <TabsContent value="history">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Cash Conversion Requests</CardTitle>
              <CardDescription className="text-xs">
                History of points converted into manual bank transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.conversion_requests || data.conversion_requests.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <History className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No conversion requests</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      When you request cash conversions, you can track the review status and transfer completion here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/20">
                      <tr>
                        <th className="py-2.5 px-3">Date Requested</th>
                        <th className="py-2.5 px-3">Points</th>
                        <th className="py-2.5 px-3">Amount (INR)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.conversion_requests.map((req) => (
                        <tr key={req.id} className="hover:bg-muted/30">
                          <td className="py-3 px-3 text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground">
                            {req.points_requested.toLocaleString()} pts
                          </td>
                          <td className="py-3 px-3 font-bold text-foreground">
                            ₹{req.inr_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3">
                            {req.status === 'pending' && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                <Clock className="size-3 mr-1" />
                                Under Review
                              </Badge>
                            )}
                            {req.status === 'paid' && (
                              <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                                <Check className="size-3 mr-1" />
                                Paid
                              </Badge>
                            )}
                            {req.status === 'rejected' && (
                              <Badge variant="destructive" className="text-[10px]">
                                Rejected & Refunded
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground text-[11px] max-w-xs truncate">
                            {req.admin_notes || req.student_notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
