# Email / SMTP Setup for AgriCompassWeb

This file documents how to configure a simple SMTP sender for local development using a free Gmail account (with an App Password) or any other SMTP provider.

IMPORTANT: Do NOT commit credentials or secrets to the repository. Use environment variables.

Recommended environment variables (example):

- `SMTP_HOST` (e.g. `smtp.gmail.com`)
- `SMTP_PORT` (e.g. `587`)
- `SMTP_USER` (your SMTP username, often your email)
- `SMTP_PASS` (SMTP password or app password)
- `SMTP_FROM` (from address, e.g. `"AgriCompass <no-reply@example.com>"`)

Gmail notes:
- Gmail no longer allows plain username/password access for normal accounts. Create an App Password from your Google Account (requires 2FA) and use that as `SMTP_PASS`.
- Use `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`.

Example `.env` (do not commit):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="AgriCompass <no-reply@yourdomain.com>"
```

Minimal Nodemailer snippet (example) — server/email.ts may already use a similar approach. This is only an illustration:

```ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('No SMTP configured — email would be sent to', to, 'subject:', subject);
    return { success: false, error: 'No SMTP configured' };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });

  return { success: true, info };
}
```

If you prefer not to configure SMTP for local dev, the server falls back to logging email content in the console. That is safe and avoids committing secrets while letting you verify email content during development.

Restart the dev server after adding environment variables so the new values are picked up.

Queue behavior
----------------
This server uses an in-process email queue to avoid blocking HTTP requests while sending emails. When an email is requested, it's enqueued and a background worker attempts delivery with retries and exponential backoff. Notes:

- The queue is in-memory (not persisted). If the server restarts, pending emails are lost. For production you should replace this with a durable queue (Redis + BullMQ, SQS, etc.).
- Retry policy: default 3 attempts with exponential backoff (2^attempts * 1000ms).
- Logs: when SMTP is not configured, emails are logged and the queue marks them as processed.

Environment variables reference
-------------------------------
- `SMTP_HOST` - SMTP server host. If set, generic SMTP mode is used.
- `SMTP_PORT` - SMTP port (default 587).
- `SMTP_SECURE` - Set to `true` or `1` to enable TLS (commonly used with port 465).
- `SMTP_USER` - SMTP username.
- `SMTP_PASS` - SMTP password (use app password for Gmail accounts with 2FA).
- `SMTP_SERVICE` - Optional. Set to `gmail` to use Gmail service shorthand (requires `SMTP_USER` and `SMTP_PASS`).
- `SMTP_FROM` - Optional. From header to use for outgoing emails.

Example `.env` for Gmail (recommended for quick testing):

```
SMTP_SERVICE=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="AgriCompass <no-reply@yourdomain.com>"
```

Example `.env` for generic SMTP:

```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@sandboxxxxx.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_FROM="AgriCompass <no-reply@yourdomain.com>"
```

Troubleshooting
---------------
- If you see `Email transporter verification failed`, check your credentials and that the SMTP host/port are reachable from your environment.
- For Gmail: ensure you created an App Password and used that as `SMTP_PASS` (Gmail blocks normal passwords if 2FA is enabled).
- To test email content without sending, omit SMTP env vars — the server will log the email content.

