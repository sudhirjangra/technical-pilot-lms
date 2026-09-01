'use client';

import { signOutAllDevices } from '@/server/auth.server';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/shadcn/alert-dialog';
import { Button } from '@repo/shadcn/button';
import { Loader2, LogOut } from '@repo/shadcn/lucide';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';

const SessionAllLogout = () => {
  const { executeAsync, isExecuting } = useAction(signOutAllDevices);
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <LogOut className="mr-1 size-4" />
          Sign out of all devices
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of all devices?</AlertDialogTitle>
          <AlertDialogDescription>
            All your active sessions, including this one, will be signed out and
            require signing in again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost">Cancel</Button>
          </AlertDialogCancel>
          <Button
            disabled={isExecuting}
            variant="destructive"
            onClick={() => executeAsync()}
          >
            {isExecuting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign out of all devices
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionAllLogout;
