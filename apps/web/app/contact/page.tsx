import { ContactForm } from '@/components/contact/contact-form';
import { APP_NAME } from '@repo/constants/app';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Contact Us | ${APP_NAME}`,
  description: `Get in touch with the ${APP_NAME} team for support, admissions, or course questions.`,
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:py-12">
      <ContactForm />
    </div>
  );
}
