# Email Feature Documentation

## Overview

This feature allows you to send exam results to students' parents via email. The system uses:
- **SMTP** for email delivery
- **BullMQ** for queue management
- **Redis** for job storage and processing
- **Template variables** for personalized emails

## Prerequisites

### 1. Install Dependencies

First, install the required packages (if not already installed):

```bash
bun install
```

The following packages have been added to `package.json`:
- `nodemailer` - Email sending
- `bullmq` - Queue management
- `ioredis` - Redis client

### 2. Install and Start Redis

The email queue requires Redis to be running on your system.

#### Windows:
1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Install and start Redis service
3. Or use Docker:
   ```bash
   docker run -d -p 6379:6379 redis
   ```

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Linux:
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

## Setup Guide

### Step 1: Configure SMTP Settings

1. Go to **Ayarlar** (Settings)
2. Select the **📧 SMTP Ayarları** tab
3. Fill in your SMTP details:
   - **SMTP Sunucusu**: e.g., `smtp.gmail.com`, `smtp.office365.com`
   - **Port**: Usually `587` (TLS) or `465` (SSL)
   - **Güvenli Bağlantı**: Enable for port 465
   - **E-posta Adresi**: Your email address
   - **Şifre**: Your email password or app password

#### Gmail Setup:
1. Go to your Google Account settings
2. Security → 2-Step Verification (must be enabled)
3. Security → App passwords
4. Generate an app password for "Mail"
5. Use this app password (not your regular password)

#### Common SMTP Providers:

| Provider | SMTP Host | Port | Secure |
|----------|-----------|------|--------|
| Gmail | smtp.gmail.com | 587 | No |
| Gmail (SSL) | smtp.gmail.com | 465 | Yes |
| Outlook/Office365 | smtp.office365.com | 587 | No |
| Yahoo | smtp.mail.yahoo.com | 587 | No |

### Step 2: Configure Email Template

1. Go to **Ayarlar** (Settings)
2. Select the **📝 E-posta Şablonu** tab
3. Customize your email template using variables:

#### Available Variables:
- `{{Ad Soyad}}` - Student full name
- `{{Okul No}}` - School number
- `{{Anne Adı Soyadı}}` - Mother's name
- `{{Anne E-posta}}` - Mother's email
- `{{Anne Telefon}}` - Mother's phone
- `{{Baba Adı Soyadı}}` - Father's name
- `{{Baba E-posta}}` - Father's email
- `{{Baba Telefon}}` - Father's phone

#### Example Template:

**Subject:**
```
{{Okul No}} - {{Ad Soyad}} Sınav Sonucu
```

**Message:**
```
Sayın {{Anne Adı Soyadı}} ve {{Baba Adı Soyadı}},

Öğrenciniz {{Ad Soyad}} ({{Okul No}}) için sınav sonucu ekte yer almaktadır.

İyi günler dileriz.
Saygılarımızla.
```

## Usage

### Step 1: Parse PDF and Get Results

1. Go to **⚙️ PDF Ayrıştırma**
2. Select a class
3. Upload and parse your PDF
4. Results will be displayed in a table

### Step 2: Select Students for Email

- **Individual Selection**: Check the checkbox next to each student
- **Select All**: Use the checkbox in the table header
- **E-posta Column**: Shows ✓ Var (has email) or ✗ Yok (no email)

### Step 3: Send Emails

1. Click **📧 Seçilenleri E-posta Gönder** button
2. Review the list of students in the confirmation modal
3. Click **Gönder** to add emails to the queue

### What Happens Next:

1. Emails are added to BullMQ queue
2. Worker processes emails in the background
3. Up to 5 emails are sent concurrently
4. Rate limited to 10 emails per minute
5. Failed emails retry up to 3 times with exponential backoff

## Features

### Email Selection
- Select specific students to send emails (useful when there are duplicates with same name)
- Only students with parent email addresses can receive emails
- Visual indicator shows which students have email addresses

### Queue Management
- **Concurrent Processing**: 5 emails at a time
- **Rate Limiting**: Max 10 emails per minute
- **Retry Logic**: 3 attempts with exponential backoff (5s, 10s, 20s)
- **Failure Tracking**: View failed jobs

### Email Content
- **Personalized**: Variables replaced with actual student data
- **Attachments**: PDF file automatically attached
- **Recipients**: Both mother and father email (if available)

## Troubleshooting

### Redis Connection Error
**Error**: `ConnectionRefused` or `ECONNREFUSED`

**Solution**:
1. Make sure Redis is installed and running
2. Check if Redis is listening on port 6379:
   ```bash
   redis-cli ping
   ```
3. Restart Redis service

### SMTP Authentication Failed
**Error**: `Invalid login` or `Authentication failed`

**Solution**:
1. Verify your SMTP credentials
2. For Gmail: Use App Password, not regular password
3. Enable "Less secure app access" if using regular password (not recommended)
4. Check if 2-factor authentication is enabled

### Emails Not Sending
**Possible Causes**:
1. Redis is not running
2. SMTP settings are incorrect
3. Student has no parent email address
4. Network/firewall blocking SMTP port

**Check**:
1. Verify Redis: `redis-cli ping`
2. Test SMTP settings in the settings page
3. Check the E-posta column in the results table
4. Check console logs for errors

### Email Goes to Spam
**Solution**:
1. Use a verified domain email address
2. Set up SPF, DKIM, and DMARC records
3. Avoid spam trigger words in subject/message
4. Send from a reputable SMTP service

## Architecture

### Data Flow:
```
User Selection → Queue Job → BullMQ → Worker → SMTP → Email Sent
```

### Files Structure:
```
electron/
  modules/
    dataManager.ts       # SMTP & template storage
    emailQueue.ts        # BullMQ queue & worker
  handlers/
    index.ts            # IPC handlers for email operations
  main.ts               # Initialize email worker

src/
  components/
    SmtpSettings.tsx     # SMTP configuration UI
    EmailTemplate.tsx    # Template editor UI
    PdfParsing.tsx       # Email sending UI
  types/
    index.ts            # Type definitions
  hooks/
    useIpc.ts           # IPC communication
```

### Storage:
- **SMTP Settings**: `~/.config/sinav-yardimicisi/smtp_settings.json`
- **Email Template**: `~/.config/sinav-yardimicisi/email_template.json`
- **Student Data**: `~/.config/sinav-yardimicisi/student_data.json`

## API Reference

### IPC Methods

```typescript
// SMTP Settings
ipc.getSmtpSettings(): Promise<SmtpSettings | null>
ipc.saveSmtpSettings(settings: SmtpSettings): Promise<void>

// Email Template
ipc.getEmailTemplate(): Promise<EmailTemplate>
ipc.saveEmailTemplate(template: EmailTemplate): Promise<void>

// Email Queue
ipc.queueEmail(emailData: EmailQueueJob): Promise<string>
ipc.getQueueStatus(): Promise<QueueStatus>
ipc.clearCompletedJobs(): Promise<void>
ipc.getFailedJobs(): Promise<FailedJob[]>
```

### Types

```typescript
interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

interface EmailTemplate {
  subject: string;
  message: string;
}

interface EmailQueueJob {
  reportId: string;
  studentName: string;
  studentInfo: StudentInfo;
  filePath: string;
  fileName: string;
  template: EmailTemplate;
}
```

## Best Practices

1. **Test First**: Send to yourself first to verify template
2. **Check Parent Emails**: Ensure all students have parent email addresses
3. **Batch Sending**: Select students carefully, especially with duplicates
4. **Monitor Queue**: Check queue status if issues occur
5. **Keep Redis Running**: Email worker needs Redis to function

## Security Notes

- SMTP credentials are stored locally in JSON files
- Consider encrypting sensitive data in production
- Use environment variables for credentials in production
- Implement proper access controls
- Use SSL/TLS for email transmission

## Future Enhancements

- [ ] Add email queue dashboard
- [ ] Real-time email sending status
- [ ] Schedule email sending
- [ ] Email templates library
- [ ] Email sending history
- [ ] Bulk email status tracking
- [ ] Email preview before sending
- [ ] Multiple language support

