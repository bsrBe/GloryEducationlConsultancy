import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { EMAIL_TEMPLATES } from './templates';

interface EmailRequest {
  sender?: { email: string; name: string };
  to?: Array<{ email: string; name: string }>;
  subject?: string;
  htmlContent?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: BrevoClient | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (apiKey) {
      this.client = new BrevoClient({ apiKey });
    }
  }

  async sendTemplateEmail(
    templateName: string,
    to: { email: string; name: string },
    data: Record<string, string>,
  ): Promise<boolean> {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template) {
      this.logger.warn(`Email template "${templateName}" not found`);
      return false;
    }

    if (!this.client) {
      this.logger.warn('Brevo API key not configured - skipping email');
      return false;
    }

    const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'noreply@gloryedu.com';
    const senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'Glory Educational Consultancy';

    try {
      const request: EmailRequest = {
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to.email, name: to.name }],
        subject: this.interpolate(template.subject, data),
        htmlContent: template.html(data),
      };

      await this.client.transactionalEmails.sendTransacEmail(request as any);
      this.logger.log(`Email sent: ${templateName} to ${to.email}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to.email}: ${error?.message || error}`);
      return false;
    }
  }

  async sendCustomEmail(
    to: { email: string; name: string }[],
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    if (!this.client) {
      this.logger.warn('Brevo API key not configured - skipping email');
      return false;
    }

    const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'noreply@gloryedu.com';
    const senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'Glory Educational Consultancy';

    try {
      const request: EmailRequest = {
        sender: { email: senderEmail, name: senderName },
        to: to.map((t) => ({ email: t.email, name: t.name })),
        subject,
        htmlContent,
      };

      await this.client.transactionalEmails.sendTransacEmail(request as any);
      this.logger.log(`Custom email sent to ${to.map((t) => t.email).join(', ')}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send custom email: ${error?.message || error}`);
      return false;
    }
  }

  private interpolate(template: string, data: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || `{${key}}`);
  }
}
