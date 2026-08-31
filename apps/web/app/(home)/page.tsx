import { auth } from '@/auth';
import HeroAviation from '@/components/hero-aviation';
import Session from '@/components/session';
import { redirect } from 'next/navigation';
import { Button } from '@repo/shadcn/button';
import Link from 'next/link';

const Page = async () => {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === 'admin') redirect('/admin');
    redirect('/dashboard');
  }
  return (
    <section className="min-h-dvh container flex flex-col">
      <nav className="w-full flex justify-end items-center py-5">
        <Session />
      </nav>
      <div className="flex flex-1 flex-col w-full justify-center items-center gap-5 py-10">
        <HeroAviation />
        <h2 className="text-2xl font-bold">Technical Pilot LMS</h2>
        <p className="text-muted-foreground">Learning Management System</p>
        {session?.user ? (
          <div className="flex flex-col items-center gap-4">
            <p>Logged in as {session.user.email}</p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/courses">Browse Courses</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/profile">Profile</Link>
              </Button>
              {session.user.role === 'admin' && (
                <Button variant="secondary" asChild>
                  <Link href="/admin">Admin Panel</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/sign-up">Sign Up</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Page;
