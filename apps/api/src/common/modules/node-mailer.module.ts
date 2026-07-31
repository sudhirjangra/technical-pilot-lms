import { Env } from '@/common/utils';
import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => {
        const apiKey = config.get('RESEND_API_KEY');

        if (apiKey) {
          return {
            transport: {
              host: 'smtp.resend.com',
              port: 465,
              secure: true,
              auth: {
                user: 'resend',
                pass: apiKey,
              },
            },
          };
        }

        // Dev fallback — emails are captured at https://ethereal.email (no real delivery)
        return {
          transport: {
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: 'ethereal.test@ethereal.email',
              pass: 'ethereal',
            },
          },
        };
      },
    }),
  ],
})
export class NodeMailerModule {}
