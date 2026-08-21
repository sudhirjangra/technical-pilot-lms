import { Global, Module } from '@nestjs/common';
import { createAdminClient, createAnonClient } from '@repo/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';

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
    {
      provide: 'SUPABASE_HEALTH_CHECK',
      useFactory: async (adminClient: SupabaseClient) => {
        try {
          const { error } = await adminClient.from('profiles').select('id').limit(1);
          return { healthy: !error, error: error?.message };
        } catch (e) {
          return { healthy: false, error: e instanceof Error ? e.message : 'Unknown error' };
        }
      },
      inject: [SUPABASE_ADMIN],
    },
  ],
  exports: [SUPABASE_ADMIN, SUPABASE_ANON, 'SUPABASE_HEALTH_CHECK'],
})
export class SupabaseModule {}
