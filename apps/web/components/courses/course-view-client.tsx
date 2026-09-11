'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPaymentOrder,
  enrollFreeCourse,
  PublicCourse,
  validateCourseCoupon,
  CouponValidationResult,
  verifyPayment,
} from '@/server/student/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Separator } from '@repo/shadcn/separator';
import { toast } from '@repo/shadcn/sonner';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  ShieldCheck,
  Tag,
} from '@repo/shadcn/lucide';
import Image from 'next/image';
import Link from 'next/link';

type RazorpayCheckout = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { email: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
}) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCheckout;
  }
}

export function CourseViewClient({
  course,
  isEnrolled,
  isLoggedIn,
  email,
  chapterCount,
  lessonCount,
}: {
  course: PublicCourse;
  isEnrolled: boolean;
  isLoggedIn: boolean;
  email?: string | null;
  chapterCount?: number;
  lessonCount?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const effectivePrice = course.discount_price ?? course.price;
  const isFree = Number(effectivePrice) === 0;
  const finalPrice = appliedCoupon ? appliedCoupon.final_price : effectivePrice;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setValidatingCoupon(true);
    const { error, result } = await validateCourseCoupon(couponCode, course.id);
    setValidatingCoupon(false);

    if (error || !result) {
      toast.error(error ?? 'Invalid coupon code');
      return;
    }

    setAppliedCoupon(result);
    toast.success(`Coupon applied! You saved ₹${result.discount_amount}`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  const handleEnrollFree = async () => {
    setLoading(true);
    const result = await enrollFreeCourse(course.id);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Enrolled successfully!');
      router.push(`/dashboard/courses/${course.id}`);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    const orderResult = await createPaymentOrder(
      course.id,
      appliedCoupon?.code,
    );
    if (orderResult.error || !orderResult.order) {
      setLoading(false);
      toast.error(orderResult.error ?? 'Unable to start payment');
      return;
    }

    try {
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Unable to load payment checkout'));
          document.body.appendChild(script);
        });
      }

      if (!window.Razorpay) throw new Error('Unable to load payment checkout');
      const order = orderResult.order;
      const checkout = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Technical Pilot LMS',
        description: order.course_title,
        order_id: order.razorpay_order_id,
        prefill: { email: email ?? '' },
        handler: async (response) => {
          const verification = await verifyPayment(response);
          setLoading(false);
          if (verification.error) {
            toast.error(verification.error);
            return;
          }
          toast.success('Payment successful. You are now enrolled.');
          router.push(`/dashboard/courses/${course.id}`);
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      checkout.open();
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : 'Unable to open payment checkout');
    }
  };

  return (
    <section className="min-h-dvh">
      <div className="container max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
        <Link href="/courses" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6">
          <ArrowLeft className="size-3.5 sm:size-4" />
          All Courses
        </Link>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Thumbnail */}
            <div className="aspect-video overflow-hidden rounded-xl bg-muted">
              {course.thumbnail_url ? (
                <Image
                  src={course.thumbnail_url}
                  alt={course.title}
                  width={800}
                  height={450}
                  className="h-full w-full object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10">
                  <GraduationCap className="size-16 text-primary/50" />
                </div>
              )}
            </div>

            {/* Title & meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {course.categories && (
                  <Badge variant="outline" className="gap-1">
                    <Tag className="size-3" />
                    {course.categories.name}
                  </Badge>
                )}
                {isEnrolled && (
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle2 className="size-3" />
                    Enrolled
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{course.title}</h1>
            </div>

            {/* Description */}
            {course.description && (
              <div>
                <h2 className="text-base font-semibold mb-2">About this course</h2>
                <div
                  className="prose-article prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: course.description }}
                />
              </div>
            )}

            {/* Course highlights */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What&apos;s included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {chapterCount != null && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      <span className="text-sm">{chapterCount} chapters</span>
                    </div>
                  )}
                  {lessonCount != null && (
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-primary" />
                      <span className="text-sm">{lessonCount} lessons</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <span className="text-sm">Lifetime access</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing sidebar */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Price */}
                <div>
                  {isFree ? (
                    <span className="text-3xl font-bold text-green-600">Free</span>
                  ) : appliedCoupon ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{appliedCoupon.final_price}
                        </span>
                        <span className="text-lg text-muted-foreground line-through">
                          ₹{effectivePrice}
                        </span>
                        <Badge variant="default" className="bg-emerald-600 text-white">
                          {appliedCoupon.discount_percentage}% OFF
                        </Badge>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Coupon {appliedCoupon.code} applied (-₹{appliedCoupon.discount_amount})
                      </p>
                    </div>
                  ) : course.discount_price ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">₹{course.discount_price}</span>
                      <span className="text-lg text-muted-foreground line-through">₹{course.price}</span>
                      <Badge variant="default" className="ml-1">
                        {Math.round((1 - course.discount_price / course.price) * 100)}% OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold">₹{course.price}</span>
                  )}
                </div>

                {/* Coupon input for enrolled/paying students */}
                {!isFree && !isEnrolled && isLoggedIn && course.status !== 'archived' && (
                  <div className="pt-1">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
                          <Tag className="size-3.5" />
                          <span>Code: {appliedCoupon.code}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={handleRemoveCoupon}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Referral or coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="h-9 text-xs uppercase"
                            disabled={validatingCoupon}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-9 px-3 text-xs"
                            onClick={handleApplyCoupon}
                            disabled={validatingCoupon || !couponCode.trim()}
                          >
                            {validatingCoupon ? 'Checking...' : 'Apply'}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Have a referral code from a friend? Enter it for an exclusive discount.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* CTA */}
                <div className="space-y-3">
                  {course.status === 'archived' ? (
                    <div className="rounded-md border border-muted bg-muted/50 p-4 text-center space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Course Archived</p>
                      <p className="text-xs text-muted-foreground">
                        This course has been archived by Technical Pilot and is not accepting enrollments.
                      </p>
                    </div>
                  ) : isEnrolled ? (
                    <Button size="lg" className="w-full" asChild>
                      <Link href={`/dashboard/courses/${course.id}`}>
                        Continue Learning
                      </Link>
                    </Button>
                  ) : isLoggedIn ? (
                    isFree ? (
                      <Button size="lg" className="w-full" onClick={handleEnrollFree} disabled={loading}>
                        {loading ? 'Enrolling...' : 'Enroll for Free'}
                      </Button>
                    ) : (
                      <Button size="lg" className="w-full" onClick={handlePayment} disabled={loading}>
                        {loading ? 'Processing...' : `Enroll — ₹${finalPrice}`}
                      </Button>
                    )
                  ) : (
                    <Button size="lg" className="w-full" variant="outline" asChild>
                      <Link href="/auth/sign-in">Sign in to Enroll</Link>
                    </Button>
                  )}
                </div>


                {!isEnrolled && (
                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment powered by Razorpay
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
