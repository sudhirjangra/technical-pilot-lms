import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_NAME } from '@repo/constants/app';
import { Logger } from 'nestjs-pino';

/**
 * Service for sending emails using the configured mailer service.
 */
@Injectable()
export class MailService {
  /**
   * Creates an instance of MailService.
   *
   * @param {MailerService} mailerService - Service for sending emails.
   * @param {ConfigService} config - Service for accessing environment variables.
   */
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {}

  /**
   * Sends an email using the mailer service.
   *
   * @param {ISendMailOptions} mailOptions - Options for the email to be sent.
   * @returns {Promise<void>}
   */
  async sendEmail(mailOptions: ISendMailOptions): Promise<void> {
    try {
      await this.mailerService.sendMail({
        from: `${APP_NAME} <${this.config.get('MAIL_FROM')}>`,
        ...mailOptions,
      });
    } catch (error) {
      this.logger.error({ error }, 'Mail delivery failed');
      throw error;
    }
  }
}
