import { JwtAuthGuard, PermissionGuard, RolesGuard } from '@/common/guards';
import {
  LoggerModule,
  NodeMailerModule,
  SupabaseModule,
  ThrottleModule,
} from '@/common/modules';
import { validateEnv } from '@/common/utils';
import { AssignmentsModule } from '@/features/assignments/assignments.module';
import { CategoriesModule } from '@/features/categories/categories.module';
import { ChaptersModule } from '@/features/chapters/chapters.module';
import { CoursesModule } from '@/features/courses/courses.module';
import { DoubtSessionsModule } from '@/features/doubt-sessions/doubt-sessions.module';
import { EnrollmentsModule } from '@/features/enrollments/enrollments.module';
import { FileModule } from '@/features/file/file.module';
import { LessonsModule } from '@/features/lessons/lessons.module';
import { PaymentsModule } from '@/features/payments/payments.module';
import { PermissionsModule } from '@/features/permissions/permissions.module';
import { ProgressModule } from '@/features/progress/progress.module';
import { TestsModule } from '@/features/tests/tests.module';
import { UsersModule } from '@/features/users/users.module';
import { VideosModule } from '@/features/videos/videos.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './features/auth/auth.module';
import { HealthModule } from './features/health/health.module';
import { MailModule } from './features/mail/mail.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    JwtModule.register({
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    SupabaseModule,
    NodeMailerModule,
    LoggerModule,
    ThrottleModule,
    AssignmentsModule,
    UsersModule,
    AuthModule,
    MailModule,
    HealthModule,
    FileModule,
    CategoriesModule,
    CoursesModule,
    ChaptersModule,
    LessonsModule,
    EnrollmentsModule,
    PaymentsModule,
    ProgressModule,
    PermissionsModule,
    TestsModule,
    DoubtSessionsModule,
    VideosModule,
  ],
})
export class AppModule {}
