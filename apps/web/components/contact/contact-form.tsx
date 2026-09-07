'use client';

import LogoIcon from '@/components/logo-icon';
import { submitContactForm } from '@/server/student-queries.server';
import { APP_NAME } from '@repo/constants/app';
import { Button } from '@repo/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { Textarea } from '@repo/shadcn/textarea';
import { CheckCircle2, Loader2, Mail, MessageSquare, Phone, Send, User } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim() || undefined,
        message: formData.message.trim(),
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Inquiry submitted successfully!');
        setSubmittedNumber(res.queryNumber || 'Submitted');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedNumber) {
    return (
      <Card className="border-border/80 bg-card/90 backdrop-blur-md shadow-md max-w-lg w-full text-center">
        <CardContent className="pt-8 pb-8 px-6 space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Message Received</CardTitle>
            <p className="text-xs font-mono text-muted-foreground">Reference: #{submittedNumber}</p>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Thank you for contacting {APP_NAME}. Our team will review your message and reach out to you via email or phone.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmittedNumber(null)}
              className="text-xs w-full sm:w-auto"
            >
              Send Another Inquiry
            </Button>
            <Button asChild size="sm" className="text-xs w-full sm:w-auto">
              <Link href="/auth/sign-in">Return to Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-md shadow-sm max-w-lg w-full">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <LogoIcon width={44} height={44} />
        </div>
        <CardTitle className="text-2xl font-bold">Contact Support</CardTitle>
        <CardDescription className="text-sm">
          Have questions about {APP_NAME}, courses, or enrollment? Send us a message.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label isRequired htmlFor="name" className="text-xs font-medium">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="pl-9 h-10 text-xs sm:text-sm"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label isRequired htmlFor="email" className="text-xs font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="pl-9 h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label isRequired htmlFor="phone" className="text-xs font-medium">
                Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+919876543210"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="pl-9 h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="subject" className="text-xs font-medium">
              Subject (Optional)
            </Label>
            <Input
              id="subject"
              type="text"
              placeholder="e.g. Course enrollment query, fee structure"
              value={formData.subject}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
              className="h-10 text-xs sm:text-sm"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-1.5">
            <Label isRequired htmlFor="message" className="text-xs font-medium">
              Your Message
            </Label>
            <div className="relative">
              <Textarea
                id="message"
                placeholder="How can our flight instructor or admissions team help you?"
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                className="text-xs sm:text-sm resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-10 text-sm gap-2 mt-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="size-4" />
                <span>Submit Inquiry</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <Link href="/auth/sign-in" className="hover:text-foreground transition-colors">
              ? Back to Sign in
            </Link>
            <Link href="/auth/sign-up" className="hover:text-foreground transition-colors">
              Create account ?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
