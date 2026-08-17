'use client';

import { deleteAccount } from '@/server/auth.server';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/shadcn/card';
import { PasswordInput } from '@repo/shadcn/password-input';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';

export default function DeleteAccountCard() {
  const [password, setPassword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {
    executeAsync,
    isExecuting,
    result: { validationErrors, serverError },
  } = useAction(deleteAccount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all of your content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
      </CardContent>
      <CardFooter>
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent and will remove all your personal
                information, settings, and associated data from our system.
                You will not be able to recover your account after this
                action.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your account password"
            />
            {(validationErrors?.password || serverError) && (
              <p className="text-sm text-red-500">
                {serverError || validationErrors?.password?._errors?.[0]}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                disabled={isExecuting}
                onClick={async () => {
                  await executeAsync({ password });
                }}
              >
                {isExecuting && '...'}
                Yes, delete my account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
