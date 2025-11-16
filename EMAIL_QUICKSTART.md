# Quick Start: Email Automation

## 5-Minute Setup

### 1. Install packages (if not already done)
```bash
npm install @modelcontextprotocol/sdk nodemailer @types/nodemailer
```

### 2. Add to `.env` file
```bash
# Gmail example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASSWORD=your-app-password-here
SMTP_FROM=SOW System <yourname@gmail.com>
BASE_URL=http://localhost:3000
```

### 3. Get Gmail App Password
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Click "App passwords"
4. Generate password for "Mail"
5. Copy 16-character password to `SMTP_PASSWORD`

### 4. Restart server
```bash
npm run dev
```

You should see:
```
[Email] Service initialized with smtp.gmail.com:587
```

### 5. Test it!

**Option A: Test via UI**
- Approve or reject any SOW
- Check your email inbox

**Option B: Test via MCP (Claude Desktop)**
```
Send an approval notification for SOW 69147247bcdf5e5b5a2d1c90 to test@example.com
```

## Usage Examples

### Example 1: SOW Approval Email (Automatic)

**Trigger**: Reviewer approves SOW in UI

**What happens:**
1. User clicks "Approve" button on SOW
2. API endpoint: `PATCH /api/sow-approvals/:id` with `status: 'approved'`
3. Email service sends green approval email to SOW creator
4. Email includes approver's comment and link to SOW

**Email preview:**
```
Subject: ✅ SOW SOW-2024-001 Approved

Hi John,

Great news! Your Statement of Work has been approved:

SOW Number: SOW-2024-001
Title: Cloud Migration Project
Approved By: Jane Reviewer
Version: 3

Comment: "Great work on the timeline. Approved for implementation."

[View SOW →]
```

### Example 2: Version Update Email (Automatic)

**Trigger**: User clicks "Save" button (manual save)

**What happens:**
1. Editor makes changes to SOW
2. Clicks "Save" button (triggers `?manual=1` flag)
3. Version increments from v2 to v3
4. Email sent to:
   - SOW creator (if different from editor)
   - All assigned reviewers
5. Email shows version number and who edited it

**Email preview:**
```
Subject: 🔄 SOW SOW-2024-001 Updated to v3

Hi Team,

A new version of the SOW has been saved:

SOW Number: SOW-2024-001
Title: Cloud Migration Project
New Version: v3
Updated By: John Smith

[View Changes →]
```

### Example 3: Rejection Email (Automatic)

**Trigger**: Reviewer rejects SOW with feedback

**What happens:**
1. Reviewer clicks "Reject" with reason
2. API endpoint: `PATCH /api/sow-approvals/:id` with `status: 'rejected'`
3. Red rejection email sent to SOW creator
4. Includes specific feedback for revision

**Email preview:**
```
Subject: 🔄 SOW SOW-2024-001 Requires Revision

Hi John,

Your Statement of Work requires revisions before approval:

SOW Number: SOW-2024-001
Title: Cloud Migration Project
Reviewed By: Jane Reviewer

Reason for Rejection:
"The risk assessment section needs more detail on data migration risks. 
Please add specific mitigation strategies."

[Review & Edit →]
```

### Example 4: Comment Notification (Automatic)

**Trigger**: Reviewer adds comment to SOW

**What happens:**
1. Reviewer adds feedback comment
2. Email sent to:
   - SOW creator
   - All other reviewers
3. Blue comment email with feedback text

**Email preview:**
```
Subject: 💬 New Comment on SOW SOW-2024-001

Hi John,

Jane Reviewer added a comment to your SOW:

SOW Number: SOW-2024-001
Title: Cloud Migration Project

"Can we clarify the rollback strategy in Phase 2? 
This would help with risk mitigation."

[View & Respond →]
```

### Example 5: AI-Assisted Email with RAG (MCP)

**Trigger**: User asks Claude to send notification

**User types in Claude Desktop:**
```
Send an approval notification for SOW with ID 69147247bcdf5e5b5a2d1c90 
to the project manager. Mention the improvements made in version 5.
```

**What happens:**
1. Claude calls MCP tool: `compose_sow_notification`
2. MCP server fetches from MongoDB:
   - SOW details (title, number, status)
   - Version 5 audit trail (what changed)
   - Approval history
   - Creator and reviewer info
3. AI generates personalized content:
   - Highlights version 5 improvements from audit trail
   - Contextual subject line
   - Relevant next steps
4. Merges with approval email template
5. Sends via SMTP

**Generated email:**
```
Subject: ✅ SOW SOW-2024-001 v5 Approved - Enhanced Risk Mitigation

Hi John,

Excellent news! Your Statement of Work (Version 5) has been approved.

SOW Number: SOW-2024-001
Title: Cloud Migration Project
Approved By: Jane Reviewer
Version: 5

This version includes significant improvements:
• Enhanced risk assessment with specific mitigation strategies
• Detailed rollback procedures for each phase
• Updated timeline with contingency buffers
• Clearer stakeholder communication plan

Comment: "The improvements in version 5 address all previous concerns. 
The risk mitigation strategies are comprehensive. Approved for implementation."

[View SOW →]

You can now proceed with project kickoff.
```

### Example 6: Bulk Notifications (MCP)

**User types in Claude Desktop:**
```
Send version update notifications for SOW SOW-2024-001 to all assigned reviewers
```

**What happens:**
1. MCP tool: `send_bulk_notifications`
2. Fetches SOW + all approvals from database
3. Identifies unique reviewers: [jane@example.com, bob@example.com, alice@example.com]
4. Generates personalized email for each based on their review stage
5. Sends batch emails

**Reviewer 1 (Stage 1 - Technical Review):**
```
Subject: 🔄 SOW SOW-2024-001 Updated to v6

Hi Jane,

A new version is ready for your technical review:

SOW Number: SOW-2024-001
New Version: v6
Your Review Stage: Technical Review
Updated By: John Smith

[Review SOW →]
```

**Reviewer 2 (Stage 2 - Budget Approval):**
```
Subject: 🔄 SOW SOW-2024-001 Updated to v6

Hi Bob,

The SOW has been updated and will need your budget approval:

SOW Number: SOW-2024-001
New Version: v6
Your Review Stage: Budget Approval  
Updated By: John Smith

[Review SOW →]
```

## Common Scenarios

### Scenario: New SOW Submission Workflow

1. **Creator submits SOW** → Automatic submission email to reviewers
2. **Reviewer 1 approves** → Approval email to creator + other reviewers
3. **Reviewer 2 adds comment** → Comment email to creator + Reviewer 1
4. **Creator updates to v2** → Version update email to all reviewers
5. **All reviewers approve** → Final approval emails to stakeholders

### Scenario: Revision Request Workflow

1. **Reviewer rejects SOW** → Rejection email with detailed feedback
2. **Creator makes revisions** → Version update emails
3. **Creator resubmits** → Submission notification to reviewers
4. **Reviewer approves** → Approval email confirming acceptance

### Scenario: AI-Assisted Batch Communication

**Use Claude to:**
```
Send a summary email to all reviewers for SOWs that have been 
pending review for more than 7 days
```

**MCP Flow:**
1. Fetches all SOWs from MongoDB
2. Filters: status='pending_review' AND updated > 7 days ago
3. Groups by reviewer
4. Generates personalized reminder emails
5. Sends batch

## Customization

### Change Email Templates

Edit `server/email-service.ts`:

```typescript
async notifyApproval(data: NotificationData): Promise<boolean> {
  const html = `
    <!-- Your custom HTML here -->
    <h1>🎉 Approved!</h1>
    <p>SOW ${data.sowNumber} is approved by ${data.actorName}</p>
  `;
  
  return this.sendEmail({
    to: data.recipientEmail,
    subject: `Approved: ${data.sowNumber}`,
    html,
  });
}
```

### Add New Notification Types

1. Add method to `email-service.ts`:
```typescript
async notifyDeadlineApproaching(data: NotificationData): Promise<boolean> {
  // Your implementation
}
```

2. Call from `routes.ts`:
```typescript
if (sow.deadline && isWithin3Days(sow.deadline)) {
  await emailService.notifyDeadlineApproaching({...});
}
```

3. Add MCP template in `mcp/email-server.ts`:
```typescript
EMAIL_TEMPLATES.deadline_approaching = {
  subject: (data) => `⏰ Deadline Approaching: ${data.sowNumber}`,
  html: (data) => `<!-- template -->`,
  text: (data) => `Deadline approaching for ${data.sowNumber}`
};
```

## Debugging

### Check if SMTP is configured:

```bash
# In server logs
[Email] Service initialized with smtp.gmail.com:587  # ✅ Working

[Email] SMTP not configured. Email notifications disabled.  # ❌ Not configured
```

### Test email manually:

```bash
# Install tsx globally
npm install -g tsx

# Create test file: test-email.ts
import { emailService } from './server/email-service';

emailService.sendEmail({
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: '<h1>Test</h1><p>This is a test email</p>',
  text: 'This is a test email'
});

# Run test
tsx test-email.ts
```

### Check MCP server logs:

In Claude Desktop:
1. Settings → Developer
2. View Logs
3. Search for `[MCP Email]`

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| No `[Email]` log on startup | Check `.env` has SMTP_* variables |
| "Invalid login" error | Use Gmail App Password, not account password |
| Emails not received | Check spam folder, verify recipient email |
| MCP tool not found | Restart Claude Desktop, check config path |
| TypeScript errors | Run `npm install`, check all deps installed |
| MongoDB connection failed | Start MongoDB: `mongod` or check MONGODB_URI |

## Production Checklist

Before deploying to production:

- [ ] Switch from Gmail to dedicated email service (SendGrid, AWS SES)
- [ ] Add rate limiting (max emails per hour)
- [ ] Configure SPF/DKIM DNS records
- [ ] Add email delivery monitoring
- [ ] Implement email queue (Redis/RabbitMQ)
- [ ] Add unsubscribe links to emails
- [ ] Test email deliverability with Mail Tester
- [ ] Set up bounce/complaint handling
- [ ] Add email sending metrics to dashboard
- [ ] Review and update email templates for branding

## Need Help?

📚 **Full Documentation:**
- `EMAIL_SETUP.md` - Complete SMTP setup guide
- `MCP_EMAIL_INTEGRATION.md` - MCP + RAG integration
- `EMAIL_IMPLEMENTATION.md` - Technical implementation details

🔧 **Quick Fixes:**
- Not sending emails? → Check SMTP credentials in `.env`
- MCP not working? → Verify `claude_desktop_config.json` path
- Template not rendering? → Check HTML escaping in email-service.ts

✅ **You're all set!** Emails will now send automatically when SOWs are approved, rejected, updated, or commented on.
