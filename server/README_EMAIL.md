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
