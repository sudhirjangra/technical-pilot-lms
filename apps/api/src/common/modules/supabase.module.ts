import { Global, Module } from '@nestjs/common';
import { createAdminClient } from '@repo/supabase/admin';

export const SUPABASE_ADMIN = 'SUPABASE_ADMIN';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      useFactory: () => createAdminClient(),
    },
  ],
  exports: [SUPABASE_ADMIN],
})
export class SupabaseModule {}
