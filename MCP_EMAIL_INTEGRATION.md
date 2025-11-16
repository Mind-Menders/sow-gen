# MCP Email Server Integration

This guide explains how to use the Model Context Protocol (MCP) email server for AI-assisted email composition with RAG (Retrieval-Augmented Generation).

## What is MCP?

The Model Context Protocol allows AI assistants like Claude to use custom tools and access context. Our MCP email server enables:

- AI-generated SOW notification emails with context from your database
- Intelligent email composition using SOW details
- Bulk notification sending with personalized content
- RAG-enhanced email content generation

## Architecture

```
Claude Desktop (or MCP Client)
        ↓
   MCP Email Server (server/mcp/email-server.ts)
        ↓
   Email Service (server/email-service.ts)
        ↓
   SMTP Provider
```

## Setup

### 1. Prerequisites

Ensure you have:
- Node.js 18+ installed
- SMTP configured (see EMAIL_SETUP.md)
- Claude Desktop (or another MCP-compatible client)

### 2. Configure Claude Desktop

Create or edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "sow-email": {
      "command": "node",
      "args": [
        "C:/Users/harry/Documents/GitHub/sow-gen-rep/sow-gen/server/mcp/email-server.ts"
      ],
      "env": {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "your-email@gmail.com",
        "SMTP_PASSWORD": "your-app-password",
        "SMTP_FROM": "SOW Management <your-email@gmail.com>",
        "MONGODB_URI": "mongodb://localhost:27017/sow_gen"
      }
    }
  }
}
```

**Note:** Update the file path to match your installation directory.

### 3. Compile TypeScript (if using .ts directly)

If running the TypeScript file directly:

```bash
npm install -g tsx
```

Then update the config to use `tsx`:

```json
{
  "mcpServers": {
    "sow-email": {
      "command": "tsx",
      "args": ["C:/path/to/server/mcp/email-server.ts"],
      "env": { ... }
    }
  }
}
```

### 4. Build for Production (Recommended)

For production, compile to JavaScript:

```bash
npx tsc server/mcp/email-server.ts --outDir dist/mcp
```

Then reference the compiled file:

```json
{
  "mcpServers": {
    "sow-email": {
      "command": "node",
      "args": ["C:/path/to/dist/mcp/email-server.js"],
      "env": { ... }
    }
  }
}
```

## Available MCP Tools

### 1. `send_email`

Send a custom email.

**Parameters:**
- `to` (string): Recipient email address
- `subject` (string): Email subject
- `content` (string): HTML email body
- `cc` (optional string): CC recipients

**Example in Claude:**
```
Send an email to john@example.com with subject "Test" and body "<h1>Hello</h1><p>This is a test</p>"
```

### 2. `compose_sow_notification`

Generate and optionally send an AI-composed SOW notification.

**Parameters:**
- `sowId` (string): The SOW ID to generate notification for
- `notificationType` (string): One of: "submission", "approval", "rejection", "comment", "version_update"
- `recipients` (string): Comma-separated email addresses
- `additionalContext` (optional string): Extra context for AI generation
- `sendEmail` (optional boolean): If true, sends the email; if false, just returns preview

**Example in Claude:**
```
Compose an approval notification for SOW 69147247bcdf5e5b5a2d1c90 
and send it to harry.viswa@gmail.com
```

This uses RAG to:
- Fetch SOW details from MongoDB
- Load approval history
- Generate contextual, personalized email content
- Send the notification

### 3. `send_bulk_notifications`

Send notifications to multiple recipients with personalized content.

**Parameters:**
- `sowId` (string): The SOW ID
- `notificationType` (string): Notification type
- `recipientEmails` (array of strings): List of recipient emails
- `additionalContext` (optional string): Extra context

**Example in Claude:**
```
Send version update notifications for SOW SOW-001 to all reviewers
```

## RAG Integration Details

The MCP server integrates RAG by:

1. **Context Retrieval**: Fetches SOW data from MongoDB
   - SOW details (title, number, version, status)
   - Approval history and reviewer information
   - Workflow stages and requirements
   - Version history and change tracking

2. **AI Generation**: Uses retrieved context to compose:
   - Personalized email subject lines
   - Contextual email body content
   - Relevant call-to-action text
   - Stage-specific messaging

3. **Template Merging**: Combines:
   - Base HTML email templates
   - AI-generated content
   - Dynamic SOW data
   - User-specific information

## Example Use Cases

### Use Case 1: Smart Approval Notifications

**User asks Claude:**
> "Send approval notification for SOW-2024-001 to the project manager, mention the key changes in version 3"

**MCP Flow:**
1. Tool: `compose_sow_notification`
2. Fetches SOW from database (version 3 details)
3. Retrieves audit trail (key changes)
4. AI generates personalized message highlighting version 3 improvements
5. Sends email with approval template + AI content

### Use Case 2: Bulk Reviewer Updates

**User asks Claude:**
> "Notify all reviewers of the updated timeline in SOW-2024-002"

**MCP Flow:**
1. Tool: `send_bulk_notifications`
2. Fetches SOW and all approvals
3. Identifies unique reviewers
4. For each reviewer: generates personalized email with their review stage context
5. Sends batch emails

### Use Case 3: Rejection with Feedback Summary

**User asks Claude:**
> "Send rejection notification for SOW ID 6901... explaining the missing risk assessment section"

**MCP Flow:**
1. Tool: `compose_sow_notification` (type: rejection)
2. Fetches SOW content
3. AI analyzes structure, identifies missing sections
4. Generates constructive feedback email
5. Sends with rejection template styling

## Email Templates

The MCP server uses 5 built-in templates:

### 1. Submission Template
- **When**: SOW submitted for review
- **Color**: Purple gradient
- **Includes**: SOW details, submitter info, review link

### 2. Approval Template
- **When**: SOW approved
- **Color**: Green gradient
- **Includes**: Approver comment, next steps, version info

### 3. Rejection Template
- **When**: SOW needs revisions
- **Color**: Red gradient
- **Includes**: Rejection reason, required changes, edit link

### 4. Comment Template
- **When**: Reviewer adds feedback
- **Color**: Blue gradient
- **Includes**: Comment text, commenter name, response link

### 5. Version Update Template
- **When**: SOW version incremented
- **Color**: Amber gradient
- **Includes**: Version number, editor name, changelog link

## Debugging

### Enable Debug Logging

In the MCP server code, logs are already enabled. Check:

```
[MCP Email] Server started on stdio transport
[MCP Email] Tool called: compose_sow_notification
[MCP Email] Retrieved SOW: SOW-001
[Email] Sent to user@example.com: SOW SOW-001 Approved
```

### Test MCP Connection

In Claude Desktop, you should see the MCP server listed in settings. Test by asking:

```
What tools do you have available for SOW emails?
```

Claude should respond with the three MCP tools.

### Troubleshooting

**Server Not Starting:**
- Check Node.js version: `node --version` (need 18+)
- Verify file paths in claude_desktop_config.json
- Check environment variables are set

**MongoDB Connection Failed:**
- Ensure MongoDB is running: `mongod --version`
- Verify MONGODB_URI in config
- Check network connectivity

**Emails Not Sending:**
- See EMAIL_SETUP.md for SMTP troubleshooting
- Verify SMTP credentials in MCP config
- Check `[Email]` logs for errors

**Tool Not Found:**
- Restart Claude Desktop after config changes
- Verify JSON syntax in config file
- Check MCP server logs in Claude settings

## Security Considerations

1. **Credentials**: Store sensitive data in environment variables, not in config
2. **Access Control**: MCP server has direct database access - secure accordingly
3. **Rate Limiting**: Consider adding rate limits for bulk operations
4. **Input Validation**: The server validates SOW IDs and email addresses
5. **Error Handling**: Errors are logged but not exposed to end users

## Advanced Configuration

### Custom Email Templates

Edit `EMAIL_TEMPLATES` object in `server/mcp/email-server.ts`:

```typescript
EMAIL_TEMPLATES.custom_event = {
  subject: (data) => `Custom: ${data.sowNumber}`,
  html: (data) => `<html>...</html>`,
  text: (data) => `Plain text version...`
};
```

### Add New Tools

Extend the `setupTools()` method:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "my_custom_tool") {
    // Implementation
  }
});
```

### Integration with Other MCP Servers

Combine with other MCP servers in Claude config:

```json
{
  "mcpServers": {
    "sow-email": { ... },
    "database-query": { ... },
    "document-generator": { ... }
  }
}
```

This allows Claude to use email + database + document tools together.

## Production Deployment

### 1. Build for Production

```bash
npm run build
```

### 2. Environment Variables

Use a secrets manager (AWS Secrets Manager, Azure Key Vault, etc.):

```typescript
import { SecretsManager } from 'aws-sdk';

const secrets = await secretsManager.getSecretValue({
  SecretId: 'sow-email-smtp'
}).promise();

const config = JSON.parse(secrets.SecretString);
```

### 3. Monitoring

Add monitoring for:
- Email send failures
- MCP tool execution times
- Database query performance
- Error rates

### 4. Scaling

For high-volume scenarios:
- Use message queues (RabbitMQ, AWS SQS)
- Implement email batching
- Add circuit breakers for SMTP failures
- Cache frequently accessed SOW data

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [Nodemailer Documentation](https://nodemailer.com/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)

## Support

For issues:
1. Check server logs in Claude Desktop settings
2. Verify SMTP configuration (EMAIL_SETUP.md)
3. Test MongoDB connection: `npm run test:mongo`
4. Review MCP server logs: `[MCP Email]` prefix
