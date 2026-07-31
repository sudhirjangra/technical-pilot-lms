'use client';
import { useSession } from 'next-auth/react';

const Session = () => {
  useSession();
  return <></>;
};

export default Session;
