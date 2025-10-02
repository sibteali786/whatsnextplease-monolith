/* eslint-disable @typescript-eslint/no-unused-vars */
import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private emailWhitelist: string[];
  private whitelistEnabled: boolean;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const useAwsSes = process.env.USE_AWS_SES === 'true' || !isProduction;
    this.whitelistEnabled = !isProduction;
    this.emailWhitelist = this.loadEmailWhitelist();
    if (isProduction && !useAwsSes) {
      // Local development: Use console logging or local SMTP (MailHog)
      this.transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      });
      logger.info('Email service initialized in DEVELOPMENT mode (using MailHog)');
    } else {
      // Production: Use AWS SES
      const sesClient = new SESv2Client({
        region: process.env.AWS_REGION || 'us-east-1',
      });

      this.transporter = nodemailer.createTransport({
        SES: { sesClient, SendEmailCommand },
      });
      logger.info(
        {
          mode: isProduction ? 'PRODUCTION' : 'STAGING',
          whitelistEnabled: this.whitelistEnabled,
          allowedPatterns: this.whitelistEnabled ? this.emailWhitelist : ['ALL'],
        },
        'Email service initialized with AWS SES'
      );
    }
  }

  private loadEmailWhitelist(): string[] {
    // Load from environment variable
    const whitelist = process.env.EMAIL_WHITELIST || '@hillcountrycoders.com';
    return whitelist.split(',').map(e => e.trim());
  }

  private isEmailAllowed(email: string): boolean {
    if (!this.whitelistEnabled) {
      return true;
    }

    const allowed = this.emailWhitelist.some(pattern => {
      if (pattern.startsWith('*@')) {
        // Wildcard domain: *@hillcountrycoders.com
        const domain = pattern.substring(1); // Remove '*'
        return email.toLowerCase().endsWith(domain.toLowerCase());
      }
      if (pattern.startsWith('@')) {
        // Legacy support: @hillcountrycoders.com
        return email.toLowerCase().endsWith(pattern.toLowerCase());
      }
      // Exact email match
      return email.toLowerCase() === pattern.toLowerCase();
    });

    if (!allowed) {
      logger.warn(
        {
          email,
          whitelist: this.emailWhitelist,
          environment: process.env.NODE_ENV,
        },
        'Email blocked by staging whitelist'
      );
    }

    return allowed;
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    // Staging Protection
    if (!this.isEmailAllowed(options.to)) {
      const error = new Error(
        `Email blocked by staging whitelist, Recipient '${options.to}' not allowed. ` +
          `Allowed patterns: ${this.emailWhitelist.join(', ')}`
      );
      logger.error(
        {
          to: options.to,
          subject: options.subject,
          whitelist: this.emailWhitelist,
        },
        error.message
      );
      throw error;
    }
    try {
      const info = await this.transporter.sendMail({
        from: `"${env.SES_FROM_NAME}" <${env.SES_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(
        {
          messageId: info.messageId,
          to: options.to,
          environment: env.NODE_ENV,
          whitelistChecked: this.whitelistEnabled,
        },
        'Email sent successfully'
      );
    } catch (error) {
      logger.error({ error, to: options.to }, 'Failed to send email');
      throw error;
    }
  }

  async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

    const html = this.getVerificationEmailTemplate(userName, verificationUrl);
    const text = this.getVerificationEmailText(userName, verificationUrl);

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<void> {
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    const html = this.getPasswordResetEmailTemplate(userName, resetUrl);
    const text = this.getPasswordResetEmailText(userName, resetUrl);

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html,
      text,
    });
  }

  private getVerificationEmailTemplate(userName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .content {
              padding: 40px 30px;
            }
            .button { 
              display: inline-block; 
              padding: 14px 28px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important; 
              text-decoration: none; 
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .button:hover {
              opacity: 0.9;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px 30px;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #e9ecef;
            }
            .link {
              color: #667eea;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to ${env.SES_FROM_NAME}!</h1>
            </div>
            
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Hi ${userName}!</h2>
              
              <p>Thanks for signing up. We're excited to have you on board!</p>
              
              <p>To get started, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" class="link">Verify Email</a>
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>This link will expire in 24 hours.</strong>
              </p>
              
              <p style="color: #666; font-size: 14px;">
                If you didn't create an account with us, please ignore this email.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">
                © ${new Date().getFullYear()} ${env.SES_FROM_NAME}. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getVerificationEmailText(userName: string, verificationUrl: string): string {
    return `
Hi ${userName}!

Thanks for signing up with ${env.SES_FROM_NAME}. 

Please verify your email address by visiting:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with us, please ignore this email.

© ${new Date().getFullYear()} ${env.SES_FROM_NAME}
    `.trim();
  }

  private getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    // TODO: Implement for forgot password feature
    return `<!-- Password reset template -->`;
  }

  private getPasswordResetEmailText(userName: string, resetUrl: string): string {
    return `Password reset text...`;
  }
}

// Export singleton instance
export const emailService = new EmailService();
