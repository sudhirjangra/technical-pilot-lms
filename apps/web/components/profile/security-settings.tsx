'use client';

import ChangePasswordForm from '@/components/auth/form/change-password.form';
import DeleteAccountCard from '@/components/profile/delete-account-card';

const SecuritySettings = () => {
  return (
    <div className="space-y-6">
      <ChangePasswordForm />
      <DeleteAccountCard />
    </div>
  );
};

export default SecuritySettings;
