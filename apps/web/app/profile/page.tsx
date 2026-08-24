import NotFound from '@/app/not-found';
import { auth } from '@/auth';
import BackNavigation from '@/components/back-navigation';
import AppearanceSettings from '@/components/profile/appearance-settings';
import ProfileHeader from '@/components/profile/profile-header';
import ProfileSidebar from '@/components/profile/profile-sidebar';
import SecuritySettings from '@/components/profile/security-settings';
import SessionsSettings from '@/components/profile/sessions-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Tabs, TabsContent } from '@repo/shadcn/tabs';
import { cookies } from 'next/headers';

const Page = async () => {
  const session = await auth();
  if (!session?.user) {
    return <NotFound />;
  }
  const user = session.user;
  const cookie = await cookies();
  const select_font = cookie?.get('select-font')?.value ?? '--font-geist';
  return (
    <section className="min-h-screen bg-background">
      <BackNavigation />
      <div className="bg-background shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfileHeader user={user} />
        </div>
      </div>
      <Tabs
        defaultValue="profile"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        <div className="w-full flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/4">
            <ProfileSidebar />
          </div>
          <TabsContent value="profile">
            <Card className="mx-auto">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <h2>{user.full_name ?? user.email}</h2>
                <hr />
                <h3>Email: {user.email}</h3>
                <h4>Role: {user.role}</h4>
                <h4>Phone: {user.phone ?? 'Not provided'}</h4>
                <h4>Date of birth: {user.date_of_birth ?? 'Not provided'}</h4>
                <h4>Active: {user.is_active ? 'Yes' : 'No'}</h4>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
          <TabsContent value="sessions">
            <SessionsSettings />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearanceSettings select_font={select_font} />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
};

export default Page;
