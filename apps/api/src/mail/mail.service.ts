import { Global, Injectable, Logger, Module } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Sends notification email. Without SMTP_HOST it only logs what it would have sent, so local development
 * needs no mail server. Delivery problems are logged and swallowed: a failed email must never fail a request.
 */
@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly from = process.env.MAIL_FROM ?? 'ESG Monitoring <no-reply@localhost>';
  private readonly transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;

  async send(to: Iterable<string | null | undefined>, subject: string, text: string) {
    const recipients = [...new Set([...to].map((a) => a?.trim().toLowerCase()).filter((a): a is string => !!a))];
    if (!recipients.length) return;
    if (!this.transport) {
      this.log.log(`[mail not sent: SMTP_HOST unset] to=${recipients.join(', ')} subject="${subject}"`);
      return;
    }
    try {
      await this.transport.sendMail({ from: this.from, to: recipients, subject, text });
    } catch (e) {
      this.log.error(`Failed to send "${subject}" to ${recipients.join(', ')}: ${(e as Error).message}`);
    }
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
