# Email Notification Setup

This application includes automated email notifications for SOW workflow events.

## Features

The email service sends notifications for:

1. **SOW Approval** - When a reviewer approves a SOW
2. **SOW Rejection** - When a reviewer rejects a SOW and requests revisions
3. **Comments** - When reviewers add feedback/comments
4. **Version Updates** - When a SOW version is incremented (manual save)

## Configuration

### 1. Install Dependencies

Already included:
```bash
npm install @modelcontextprotocol/sdk nodemailer @types/nodemailer
```

### 2. Configure SMTP Settings

Add these environment variables to your `.env` file:

```bash
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=SOW Management <your-email@gmail.com>
BASE_URL=http://localhost:3000
```

### 3. Gmail Setup (Recommended)

If using Gmail:

1. Go to your Google Account settings
2. Enable 2-factor authentication
3. Generate an App Password:
   - Go to Security > 2-Step Verification > App passwords
   - Create a new app password for "Mail"
   - Copy the 16-character password
4. Use the app password as `SMTP_PASSWORD`

**Gmail Settings:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

### 4. Other SMTP Providers

#### Outlook/Office 365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key-id
SMTP_PASSWORD=your-aws-secret-access-key
```

### 5. Testing

After configuration, the service will log its status on startup:

```
[Email] Service initialized with smtp.gmail.com:587
```

If not configured, you'll see:
```
[Email] SMTP not configured. Email notifications disabled.
```

## Email Templates

The service includes professionally designed HTML email templates with:

- Gradient headers with appropriate colors per event type
- Clean, modern styling
- Direct action buttons
- Mobile-responsive design
- Fallback plain text versions

### Template Examples

1. **Approval Email** - Green gradient, celebration tone
2. **Rejection Email** - Red gradient, constructive feedback tone
3. **Comment Email** - Blue gradient, collaborative tone
4. **Version Update** - Amber gradient, informational tone

## Troubleshooting

### Emails Not Sending

1. Check environment variables are set correctly
2. Verify SMTP credentials
3. For Gmail, ensure app password (not regular password) is used
4. Check firewall/network allows SMTP port (587 or 465)
5. Look for error logs: `[Email] Failed to send:`

### Testing Email Configuration

You can test by:

1. Approving/rejecting a SOW
2. Adding a comment to a SOW
3. Manually saving a SOW (increments version)
4. Check browser console and server logs for `[Email]` messages

### Disable Email Notifications

Simply don't set the SMTP environment variables, or remove them from `.env`:

```bash
# Comment out or remove these lines
# SMTP_HOST=...
# SMTP_USER=...
# SMTP_PASSWORD=...
```

The application will work normally without email notifications.

## MCP Integration (Optional)

For AI-assisted email composition using RAG, see `server/mcp/email-server.ts`.

The MCP server provides:

- `send_email` - Send custom emails
- `compose_sow_notification` - AI-generated SOW notifications
- `send_bulk_notifications` - Batch email sending

To enable MCP email features, configure the MCP server separately (requires Claude Desktop or compatible MCP client).

## Security Notes

- Never commit `.env` files to version control
- Use app passwords, not regular passwords
- Rotate credentials periodically
- Consider using dedicated email sending services (SendGrid, AWS SES) for production
- SMTP credentials should have minimal permissions

## Production Recommendations

1. Use a dedicated email service (SendGrid, AWS SES, etc.)
2. Implement rate limiting
3. Add email queue system for reliability
4. Monitor bounce rates and failures
5. Include unsubscribe functionality for compliance
6. Use environment-specific sender addresses
