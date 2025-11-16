import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface NotificationData {
  recipientEmail: string;
  recipientName: string;
  sowNumber: string;
  sowTitle: string;
  actorName: string; // Person who triggered the action
  version?: number;
  comment?: string;
  reason?: string;
  actionUrl?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
      console.warn('[Email] SMTP not configured. Email notifications disabled.');
      console.warn('[Email] Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env to enable emails');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });

      this.enabled = true;
      console.log(`[Email] Service initialized with ${host}:${port}`);
    } catch (error) {
      console.error('[Email] Failed to initialize transport:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      console.warn('[Email] Cannot send email - service not enabled');
      return false;
    }

    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER;
      await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send:', error);
      return false;
    }
  }

  // SOW Submission Notification
  async notifySubmission(data: NotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📝 New SOW Submitted for Review</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${data.recipientName}</strong>,</p>
            
            <p>A new Statement of Work has been submitted and requires your review:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>SOW Number:</strong> <span class="highlight">${data.sowNumber}</span></p>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${data.sowTitle}</p>
              <p style="margin: 5px 0;"><strong>Submitted By:</strong> ${data.actorName}</p>
              ${data.version ? `<p style="margin: 5px 0;"><strong>Version:</strong> ${data.version}</p>` : ''}
            </div>
            
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">Review SOW →</a>` : ''}
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              Please review the SOW and provide your approval or feedback.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from SOW Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `🔔 SOW ${data.sowNumber} Submitted for Review`,
      html,
      text: `Hi ${data.recipientName},\n\nA new SOW has been submitted:\n\nSOW: ${data.sowNumber}\nTitle: ${data.sowTitle}\nSubmitted By: ${data.actorName}\n\nPlease review and approve.`,
    });
  }

  // SOW Approval Notification
  async notifyApproval(data: NotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .highlight { background: #d1fae5; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ SOW Approved</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${data.recipientName}</strong>,</p>
            
            <p>Great news! Your Statement of Work has been approved:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>SOW Number:</strong> <span class="highlight">${data.sowNumber}</span></p>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${data.sowTitle}</p>
              <p style="margin: 5px 0;"><strong>Approved By:</strong> ${data.actorName}</p>
              ${data.version ? `<p style="margin: 5px 0;"><strong>Version:</strong> ${data.version}</p>` : ''}
              ${data.comment ? `<p style="margin: 15px 0; padding: 15px; background: #f3f4f6; border-left: 3px solid #10b981; border-radius: 4px;"><strong>Comment:</strong><br>${data.comment}</p>` : ''}
            </div>
            
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View SOW →</a>` : ''}
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              You can now proceed with the next steps.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from SOW Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `✅ SOW ${data.sowNumber} Approved`,
      html,
      text: `Hi ${data.recipientName},\n\nYour SOW has been approved!\n\nSOW: ${data.sowNumber}\nTitle: ${data.sowTitle}\nApproved By: ${data.actorName}${data.comment ? `\n\nComment: ${data.comment}` : ''}`,
    });
  }

  // SOW Rejection Notification
  async notifyRejection(data: NotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .highlight { background: #fee2e2; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">❌ SOW Requires Revision</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${data.recipientName}</strong>,</p>
            
            <p>Your Statement of Work requires revisions before approval:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>SOW Number:</strong> <span class="highlight">${data.sowNumber}</span></p>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${data.sowTitle}</p>
              <p style="margin: 5px 0;"><strong>Reviewed By:</strong> ${data.actorName}</p>
              ${data.version ? `<p style="margin: 5px 0;"><strong>Version:</strong> ${data.version}</p>` : ''}
              ${data.reason ? `<p style="margin: 15px 0; padding: 15px; background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 4px;"><strong>Reason for Rejection:</strong><br>${data.reason}</p>` : ''}
            </div>
            
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">Review & Edit →</a>` : ''}
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              Please address the feedback and resubmit for review.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from SOW Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `🔄 SOW ${data.sowNumber} Requires Revision`,
      html,
      text: `Hi ${data.recipientName},\n\nYour SOW requires revisions:\n\nSOW: ${data.sowNumber}\nTitle: ${data.sowTitle}\nReviewed By: ${data.actorName}${data.reason ? `\n\nReason: ${data.reason}` : ''}\n\nPlease address the feedback and resubmit.`,
    });
  }

  // Comment/Feedback Notification
  async notifyComment(data: NotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .highlight { background: #dbeafe; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">💬 New Comment on SOW</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${data.recipientName}</strong>,</p>
            
            <p><strong>${data.actorName}</strong> added a comment to your SOW:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>SOW Number:</strong> <span class="highlight">${data.sowNumber}</span></p>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${data.sowTitle}</p>
              ${data.comment ? `<p style="margin: 15px 0; padding: 15px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px;">${data.comment}</p>` : ''}
            </div>
            
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View & Respond →</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from SOW Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `💬 New Comment on SOW ${data.sowNumber}`,
      html,
      text: `Hi ${data.recipientName},\n\n${data.actorName} commented on SOW ${data.sowNumber}:\n\n${data.comment || 'No comment text'}`,
    });
  }

  // Version Update Notification
  async notifyVersionUpdate(data: NotificationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔄 SOW Version Updated</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${data.recipientName}</strong>,</p>
            
            <p>A new version of the SOW has been saved:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>SOW Number:</strong> <span class="highlight">${data.sowNumber}</span></p>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${data.sowTitle}</p>
              <p style="margin: 5px 0;"><strong>New Version:</strong> <span class="highlight">v${data.version}</span></p>
              <p style="margin: 5px 0;"><strong>Updated By:</strong> ${data.actorName}</p>
            </div>
            
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View Changes →</a>` : ''}
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              You're receiving this because you're involved with this SOW.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from SOW Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `🔄 SOW ${data.sowNumber} Updated to v${data.version}`,
      html,
      text: `Hi ${data.recipientName},\n\nSOW ${data.sowNumber} has been updated:\n\nNew Version: v${data.version}\nUpdated By: ${data.actorName}\nTitle: ${data.sowTitle}`,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const emailService = new EmailService();
