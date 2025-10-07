import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface EmailResult {
  success: boolean;
  provider: 'resend' | 'ses' | 'mailhog';
  messageId?: string;
  error?: string;
  blocked?: boolean;
}

export class EmailService {
  private resendClient: Resend | null = null;
  private sesTransporter: nodemailer.Transporter | null = null;
  private mailhogTransporter: nodemailer.Transporter | null = null;
  private emailWhitelist: string[];
  private whitelistEnabled: boolean;
  private emailProvider: 'resend' | 'ses' | 'mailhog';

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const emailProvider = process.env.EMAIL_PROVIDER || 'ses';

    this.emailProvider = emailProvider as 'resend' | 'ses' | 'mailhog';
    this.whitelistEnabled = !isProduction;
    this.emailWhitelist = this.loadEmailWhitelist();

    // Initialize Resend if API key is available
    if (process.env.RESEND_API_KEY) {
      this.resendClient = new Resend(process.env.RESEND_API_KEY);
      logger.info('Resend client initialized');
    }

    // Initialize AWS SES
    if (process.env.USE_AWS_SES === 'true' || isProduction) {
      const sesClient = new SESv2Client({
        region: process.env.AWS_REGION || 'us-east-1',
      });

      this.sesTransporter = nodemailer.createTransport({
        SES: { sesClient, SendEmailCommand },
      });
      logger.info('AWS SES transporter initialized');
    }

    // Initialize MailHog for local development
    if (!isProduction) {
      this.mailhogTransporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      });
      logger.info('MailHog transporter initialized');
    }

    logger.info(
      {
        primaryProvider: this.emailProvider,
        hasResend: !!this.resendClient,
        hasSES: !!this.sesTransporter,
        hasMailHog: !!this.mailhogTransporter,
        whitelistEnabled: this.whitelistEnabled,
        environment: process.env.NODE_ENV,
      },
      'Email service initialized'
    );
  }

  private loadEmailWhitelist(): string[] {
    const whitelist = process.env.EMAIL_WHITELIST || '@hillcountrycoders.com';
    return whitelist.split(',').map(e => e.trim());
  }

  private isEmailAllowed(email: string): boolean {
    if (!this.whitelistEnabled) {
      return true;
    }

    const allowed = this.emailWhitelist.some(pattern => {
      if (pattern.startsWith('*@')) {
        const domain = pattern.substring(1);
        return email.toLowerCase().endsWith(domain.toLowerCase());
      }
      if (pattern.startsWith('@')) {
        return email.toLowerCase().endsWith(pattern.toLowerCase());
      }
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

  /**
   * Send email via Resend
   */
  private async sendViaResend(options: EmailOptions): Promise<EmailResult> {
    if (!this.resendClient) {
      throw new Error('Resend client not initialized');
    }

    try {
      const { data } = await this.resendClient.emails.send({
        from: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      if (!data) {
        return { success: false, provider: 'resend' };
      }
      logger.info(
        {
          messageId: data?.id,
          to: options.to,
          provider: 'resend',
        },
        'Email sent successfully via Resend'
      );

      return {
        success: true,
        provider: 'resend',
        messageId: data?.id,
      };
    } catch (error) {
      logger.error(
        {
          error,
          to: options.to,
          provider: 'resend',
        },
        'Failed to send email via Resend'
      );
      throw error;
    }
  }

  /**
   * Send email via AWS SES
   */
  private async sendViaSES(options: EmailOptions): Promise<EmailResult> {
    if (!this.sesTransporter) {
      throw new Error('SES transporter not initialized');
    }

    try {
      const info = await this.sesTransporter.sendMail({
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
          provider: 'ses',
        },
        'Email sent successfully via SES'
      );

      return {
        success: true,
        provider: 'ses',
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error(
        {
          error,
          to: options.to,
          provider: 'ses',
        },
        'Failed to send email via SES'
      );
      throw error;
    }
  }

  /**
   * Send email via MailHog (local development)
   */
  private async sendViaMailHog(options: EmailOptions): Promise<EmailResult> {
    if (!this.mailhogTransporter) {
      throw new Error('MailHog transporter not initialized');
    }

    try {
      const info = await this.mailhogTransporter.sendMail({
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
          provider: 'mailhog',
        },
        'Email sent to MailHog'
      );

      return {
        success: true,
        provider: 'mailhog',
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error(
        {
          error,
          to: options.to,
          provider: 'mailhog',
        },
        'Failed to send email via MailHog'
      );
      throw error;
    }
  }

  /**
   * Main send email method with automatic fallback
   *
   * IMPORTANT: This method now returns EmailResult with blocked flag
   * instead of throwing errors for whitelist violations.
   * This allows the calling code to handle whitelist blocks gracefully.
   */
  private async sendEmail(options: EmailOptions): Promise<EmailResult> {
    // NEW: Check whitelist FIRST and return early if blocked
    // Don't throw error - return result with blocked flag
    if (!this.isEmailAllowed(options.to)) {
      logger.info(
        {
          to: options.to,
          subject: options.subject,
          whitelist: this.emailWhitelist,
          environment: process.env.NODE_ENV,
        },
        'Email blocked by staging whitelist - returning blocked result'
      );

      // Return a "success" result but with blocked flag
      // This prevents the signup flow from failing
      return {
        success: true, // TRUE so signup doesn't fail
        blocked: true, // NEW flag to indicate it was blocked
        provider: this.emailProvider,
        error: `Email blocked by staging whitelist. Allowed patterns: ${this.emailWhitelist.join(', ')}`,
      };
    }

    // Try primary provider
    try {
      switch (this.emailProvider) {
        case 'resend':
          if (this.resendClient) {
            return await this.sendViaResend(options);
          }
          logger.warn('Resend selected but not initialized, falling back to SES');
          break;

        case 'mailhog':
          if (this.mailhogTransporter) {
            return await this.sendViaMailHog(options);
          }
          logger.warn('MailHog selected but not available, falling back to SES');
          break;

        case 'ses':
          if (this.sesTransporter) {
            return await this.sendViaSES(options);
          }
          throw new Error('SES selected but not initialized');
      }
    } catch (primaryError) {
      logger.error(
        {
          error: primaryError,
          primaryProvider: this.emailProvider,
        },
        'Primary email provider failed, attempting fallback'
      );

      // Fallback to SES if available and not already tried
      if (this.emailProvider !== 'ses' && this.sesTransporter) {
        try {
          logger.info('Attempting SES fallback');
          return await this.sendViaSES(options);
        } catch (fallbackError) {
          logger.error(
            {
              primaryError,
              fallbackError,
              to: options.to,
            },
            'Both primary and fallback email providers failed'
          );
          throw new Error('All email providers failed');
        }
      }

      throw primaryError;
    }

    throw new Error('No email provider available');
  }

  /**
   * Send verification email
   * NOW RETURNS EmailResult so calling code can handle whitelist blocks
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    userName: string
  ): Promise<EmailResult> {
    const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

    const html = this.getVerificationEmailTemplate(userName, verificationUrl);
    const text = this.getVerificationEmailText(userName, verificationUrl);

    return await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   * NOW RETURNS EmailResult so calling code can handle whitelist blocks
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    userName: string
  ): Promise<EmailResult> {
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    const html = this.getPasswordResetEmailTemplate(userName, resetUrl);
    const text = this.getPasswordResetEmailText(userName, resetUrl);

    return await this.sendEmail({
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
                <a href="${verificationUrl}" class="link">Click Here</a>
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
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          
          <div class="content">
            <p>Hi ${userName},</p>
            
            <p>We received a request to reset your password. Click the button below to choose a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" class="link">${resetUrl}</a>
            </p>
            
            <p style="color: #e74c3c; font-size: 14px; margin-top: 30px;">
              <strong>⚠️ This link will expire in 1 hour.</strong>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
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

  private getPasswordResetEmailText(userName: string, resetUrl: string): string {
    return `
Hi ${userName},

We received a request to reset your password.

To reset your password, visit:
${resetUrl}

⚠️ This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} ${env.SES_FROM_NAME}
  `.trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();
