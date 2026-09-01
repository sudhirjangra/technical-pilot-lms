import { auth } from '@/auth';
import SessionOtherLogout from '@/components/auth/session-other-logout';
import SessionAllLogout from '@/components/auth/session-all-logout';
import { getAuthSessions } from '@/server/auth.server';
import { Badge } from '@repo/shadcn/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import { Laptop, Smartphone, TriangleAlert } from '@repo/shadcn/lucide';
import { formatDate } from '@repo/utils';

const SessionsSettings = async () => {
  const sessions = await getAuthSessions();
  const authSession = await auth();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage your active sessions across different devices
            </CardDescription>
          </div>
          {sessions.length > 0 && <SessionAllLogout />}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {sessions
              .sort(
                (a, b) =>
                  new Date(b.last_active_at).getTime() -
                  new Date(a.last_active_at).getTime(),
              )
              .map((session) => {
                const isCurrent =
                  session.id === authSession?.user?.tokens.session_token;
                const icon =
                  session.platform === 'web' ? (
                    <Laptop className="size-7 text-muted-foreground" />
                  ) : session.platform === 'android' ||
                    session.platform === 'ios' ? (
                    <Smartphone className="size-7 text-muted-foreground" />
                  ) : (
                    <TriangleAlert className="size-7 text-muted-foreground" />
                  );

                return (
                  <div
                    key={session.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex gap-3">
                      {icon}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {session.device_name}
                          </h3>
                          {isCurrent && (
                            <Badge variant="secondary">Current Session</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Platform: {session.platform}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last active:{' '}
                          {formatDate(
                            session.last_active_at,
                            'MM-DD-YYYY / hh:mm:ss:A',
                          )}
                        </p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <SessionOtherLogout session_token={session.id} />
                    )}
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionsSettings;
