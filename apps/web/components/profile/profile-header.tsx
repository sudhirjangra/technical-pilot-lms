import ProfileAvatarEditor from '@/components/profile/profile-avatar-editor';
import { User } from 'next-auth';
import Image from 'next/image';

const ProfileHeader = async ({ user }: { user: User }) => {
  return (
    <div className="relative pb-4">
      <div className="h-48 sm:h-64 w-full relative rounded-b-lg overflow-hidden bg-muted">
        <Image
          src={'/assets/placeholder.svg'}
          alt="Cover"
          fill
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-20 ml-0 sm:ml-8 relative z-10">
        <div className="relative">
          <ProfileAvatarEditor />
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 sm:gap-4 mb-2 sm:mb-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">
              {user.full_name ?? user.email}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
