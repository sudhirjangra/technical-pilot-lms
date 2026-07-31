import { auth } from '@/auth';
import LogoIcon from '@/components/logo-icon';
import Session from '@/components/session';
import { Button } from '@repo/shadcn/button';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import Link from 'next/link';

const Page = async () => {
  const session = await auth();
  return (
    <section className="min-h-dvh container flex flex-col">
      <nav className="w-full flex justify-between items-center py-5">
        <Link href="/">
          <LogoIcon width={30} height={30} />
        </Link>
        <div className="flex items-center gap-3">
          <ModeSwitcher />
          <Session />
        </div>
      </nav>
      <div className="flex flex-1 flex-col w-full justify-center items-center gap-5">
        <h2 className="text-2xl font-bold">Institution LMS</h2>
        <p className="text-muted-foreground">Learning Management System</p>
        {session?.user ? (
          <div className="flex flex-col items-center gap-4">
            <p>Logged in as {session.user.email}</p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/profile">Your Profile</Link>
              </Button>
              {session.user.role === 'admin' && (
                <Button variant="outline" asChild>
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
