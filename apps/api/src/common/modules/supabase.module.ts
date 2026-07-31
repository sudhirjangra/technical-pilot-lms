import { Global, Module } from '@nestjs/common';
import { createAdminClient, createAnonClient } from '@repo/supabase/admin';

export const SUPABASE_ADMIN = 'SUPABASE_ADMIN';
export const SUPABASE_ANON = 'SUPABASE_ANON';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      useFactory: () => createAdminClient(),
    },
    {
      provide: SUPABASE_ANON,
      useFactory: () => createAnonClient(),
    },
  ],
  exports: [SUPABASE_ADMIN, SUPABASE_ANON],
})
export class SupabaseModule {}
