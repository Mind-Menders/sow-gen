/**
 * MCP Email Server
 * Provides email composition and sending capabilities via Model Context Protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "",
  },
};

// Email templates for SOW-related notifications
const EMAIL_TEMPLATES = {
  sowSubmitted: {
    subject: "SOW #{sowNumber} Submitted for Review - {title}",
    body: `
Dear {recipientName},

A new Statement of Work has been submitted for your review:

SOW Number: {sowNumber}
Title: {title}
Vendor: {vendorName}
Sponsor: {sponsor}
Type: {sowType}
Budget: {currency} {budget}

Please review the SOW at your earliest convenience:
{sowUrl}

Best regards,
SOW Management System
    `.trim(),
  },
  
  sowApproved: {
    subject: "SOW #{sowNumber} Approved - {title}",
    body: `
Dear {recipientName},

The following Statement of Work has been approved:

SOW Number: {sowNumber}
Title: {title}
Vendor: {vendorName}
Approved by: {approverName}
Date: {approvalDate}

You can view the approved SOW here:
{sowUrl}

Best regards,
SOW Management System
    `.trim(),
  },
  
  sowRejected: {
    subject: "SOW #{sowNumber} Rejected - {title}",
    body: `
Dear {recipientName},

The following Statement of Work has been rejected:

SOW Number: {sowNumber}
Title: {title}
Vendor: {vendorName}
Rejected by: {reviewerName}
Reason: {rejectionReason}

Please review the feedback and make necessary revisions:
{sowUrl}

Best regards,
SOW Management System
    `.trim(),
  },
  
  sowCommentAdded: {
    subject: "New Comment on SOW #{sowNumber} - {title}",
    body: `
Dear {recipientName},

A new comment has been added to the following Statement of Work:

SOW Number: {sowNumber}
Title: {title}
Comment by: {commenterName}
Comment: {comment}

View and respond to the comment here:
{sowUrl}

Best regards,
SOW Management System
    `.trim(),
  },
  
  sowVersionUpdated: {
    subject: "SOW #{sowNumber} Updated to Version {version} - {title}",
    body: `
Dear {recipientName},

The following Statement of Work has been updated:

SOW Number: {sowNumber}
Title: {title}
New Version: {version}
Updated by: {updatedBy}
Date: {updateDate}

View the latest version here:
{sowUrl}

Best regards,
SOW Management System
    `.trim(),
  },
};

class EmailMCPServer {
  private server: Server;
  private transporter: Transporter | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "sow-email-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.initializeEmailTransport();
  }

  private initializeEmailTransport() {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.warn("Email credentials not configured. Email sending will be simulated.");
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(EMAIL_CONFIG);
      console.log("Email transport initialized successfully");
    } catch (error) {
      console.error("Failed to initialize email transport:", error);
    }
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "send_email",
          description: "Send an email with the specified content",
          inputSchema: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Recipient email address (comma-separated for multiple)",
              },
              cc: {
                type: "string",
                description: "CC email addresses (comma-separated, optional)",
              },
              subject: {
                type: "string",
                description: "Email subject line",
              },
              body: {
                type: "string",
                description: "Email body content (plain text or HTML)",
              },
              isHtml: {
                type: "boolean",
                description: "Whether the body is HTML formatted",
              },
            },
            required: ["to", "subject", "body"],
          },
        },
        {
          name: "compose_sow_notification",
          description: "Compose an email notification for SOW-related events using templates",
          inputSchema: {
            type: "object",
            properties: {
              templateType: {
                type: "string",
                enum: ["sowSubmitted", "sowApproved", "sowRejected", "sowCommentAdded", "sowVersionUpdated"],
                description: "Type of SOW notification template to use",
              },
              recipientEmail: {
                type: "string",
                description: "Recipient email address",
              },
              recipientName: {
                type: "string",
                description: "Recipient name",
              },
              sowData: {
                type: "object",
                description: "SOW data to populate the template",
                properties: {
                  sowNumber: { type: "string" },
                  title: { type: "string" },
                  vendorName: { type: "string" },
                  sponsor: { type: "string" },
                  sowType: { type: "string" },
                  budget: { type: "string" },
                  currency: { type: "string" },
                  version: { type: "number" },
                  sowUrl: { type: "string" },
                  approverName: { type: "string" },
                  reviewerName: { type: "string" },
                  rejectionReason: { type: "string" },
                  comment: { type: "string" },
                  commenterName: { type: "string" },
                  updatedBy: { type: "string" },
                  approvalDate: { type: "string" },
                  updateDate: { type: "string" },
                },
              },
              sendImmediately: {
                type: "boolean",
                description: "If true, sends the email immediately. If false, returns the composed email for review",
              },
            },
            required: ["templateType", "recipientEmail", "recipientName", "sowData"],
          },
        },
        {
          name: "send_bulk_notifications",
          description: "Send SOW notifications to multiple recipients",
          inputSchema: {
            type: "object",
            properties: {
              templateType: {
                type: "string",
                enum: ["sowSubmitted", "sowApproved", "sowRejected", "sowCommentAdded", "sowVersionUpdated"],
                description: "Type of SOW notification template to use",
              },
              recipients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    name: { type: "string" },
                  },
                  required: ["email", "name"],
                },
                description: "List of recipients",
              },
              sowData: {
                type: "object",
                description: "SOW data to populate the template",
              },
            },
            required: ["templateType", "recipients", "sowData"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "send_email":
            return await this.handleSendEmail(args as any);
          case "compose_sow_notification":
            return await this.handleComposeSowNotification(args as any);
          case "send_bulk_notifications":
            return await this.handleSendBulkNotifications(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleSendEmail(args: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
    isHtml?: boolean;
  }) {
    if (!this.transporter) {
      // Simulate email sending in development
      console.log("=== SIMULATED EMAIL ===");
      console.log("To:", args.to);
      if (args.cc) console.log("CC:", args.cc);
      console.log("Subject:", args.subject);
      console.log("Body:", args.body);
      console.log("======================");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              simulated: true,
              message: "Email simulated (no SMTP configured)",
              to: args.to,
              subject: args.subject,
            }, null, 2),
          },
        ],
      };
    }

    const mailOptions = {
      from: EMAIL_CONFIG.auth.user,
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      ...(args.isHtml ? { html: args.body } : { text: args.body }),
    };

    const info = await this.transporter.sendMail(mailOptions);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            messageId: info.messageId,
            to: args.to,
            subject: args.subject,
          }, null, 2),
        },
      ],
    };
  }

  private composeEmailFromTemplate(
    templateType: keyof typeof EMAIL_TEMPLATES,
    recipientName: string,
    sowData: Record<string, any>
  ) {
    const template = EMAIL_TEMPLATES[templateType];
    if (!template) {
      throw new Error(`Unknown template type: ${templateType}`);
    }

    let subject = template.subject;
    let body = template.body;

    // Replace placeholders
    const data = { recipientName, ...sowData };
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value || ''));
      body = body.replace(new RegExp(placeholder, 'g'), String(value || ''));
    }

    return { subject, body };
  }

  private async handleComposeSowNotification(args: {
    templateType: keyof typeof EMAIL_TEMPLATES;
    recipientEmail: string;
    recipientName: string;
    sowData: Record<string, any>;
    sendImmediately?: boolean;
  }) {
    const { subject, body } = this.composeEmailFromTemplate(
      args.templateType,
      args.recipientName,
      args.sowData
    );

    if (args.sendImmediately) {
      return await this.handleSendEmail({
        to: args.recipientEmail,
        subject,
        body,
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            composed: true,
            to: args.recipientEmail,
            subject,
            body,
            preview: body.substring(0, 200) + "...",
          }, null, 2),
        },
      ],
    };
  }

  private async handleSendBulkNotifications(args: {
    templateType: keyof typeof EMAIL_TEMPLATES;
    recipients: Array<{ email: string; name: string }>;
    sowData: Record<string, any>;
  }) {
    const results = [];

    for (const recipient of args.recipients) {
      try {
        const result = await this.handleComposeSowNotification({
          templateType: args.templateType,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          sowData: args.sowData,
          sendImmediately: true,
        });
        results.push({ recipient: recipient.email, success: true, result });
      } catch (error) {
        results.push({
          recipient: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            totalSent: results.filter(r => r.success).length,
            totalFailed: results.filter(r => !r.success).length,
            results,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("SOW Email MCP Server running on stdio");
  }
}

// Run the server
const server = new EmailMCPServer();
server.run().catch(console.error);
