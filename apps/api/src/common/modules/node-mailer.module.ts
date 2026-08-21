import { Env } from '@/common/utils';
import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => {
        const smtpHost = config.get('SMTP_HOST');
        const smtpPort = config.get('SMTP_PORT');
        const smtpUser = config.get('SMTP_USER');
        const smtpPass = config.get('SMTP_PASS');

        if (smtpHost && smtpUser && smtpPass) {
          const numericPort = Number(smtpPort ?? 587);
          return {
            transport: {
              host: smtpHost,
              port: numericPort,
              secure: numericPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              connectionTimeout: 10000,
              socketTimeout: 10000,
            },
            defaults: {
              from: `${config.get('MAIL_FROM')}`,
            },
          };
        }

        // Dev fallback — no network connections, emails are silently discarded
        console.warn('⚠️ SMTP not configured. Emails will NOT be sent (dev mode).');
        return {
          transport: nodemailer.createTransport({ jsonTransport: true }),
          defaults: { from: 'dev@localhost' },
        };
      },
    }),
  ],
})
export class NodeMailerModule {}
