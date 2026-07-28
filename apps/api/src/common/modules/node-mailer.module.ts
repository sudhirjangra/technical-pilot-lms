import { Env } from '@/common/utils';
import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

/**
 * Module for configuring and providing the Nodemailer-based mailer service.
 *
 * Uses Ethereal in development when SMTP credentials are not configured,
 * which allows local email delivery without breaking the auth flow.
 */
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => {
        const host = config.get('MAIL_HOST');
        const username = config.get('MAIL_USERNAME');
        const password = config.get('MAIL_PASSWORD');

        if (host && username && password && host !== 'ethereal') {
          return {
            transport: {
              service: host,
              auth: {
                user: username,
                pass: password,
              },
            },
          };
        }

        return {
          transport: createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: 'your-ethereal-user',
              pass: 'your-ethereal-pass',
            },
          }),
        };
      },
    }),
  ],
})
export class NodeMailerModule {}
