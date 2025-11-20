# Email Setup Guide

## Free Email Service (Recommended)

AgriCompass uses **Resend** as the primary email service with SMTP as an optional fallback.

### Why Resend?
- ✅ **100% FREE** for development and small-scale production
- ✅ 3,000 emails per month
- ✅ 100 emails per day
- ✅ No credit card required
- ✅ Simple API, reliable delivery
- ✅ Great for testing and early growth

### Quick Setup (5 minutes)

1. **Sign up for Resend (Free)**
   - Go to https://resend.com
   - Create a free account (no credit card needed)

2. **Get your API key**
   - After signing in, go to API Keys section
   - Click "Create API Key"
   - Copy your API key (starts with `re_`)

3. **Add to your .env file**
   ```bash
   RESEND_API_KEY=re_your_actual_api_key_here
   EMAIL_FROM=AgriCompass <onboarding@resend.dev>
   FRONTEND_URL=http://localhost:5000
   ```

4. **That's it!** 
   - Emails will now be sent automatically
   - Check logs to confirm: `Email sent via Resend to user@example.com`

### Email Types Sent
- 🔐 Password reset links
- 👋 Welcome emails (new user onboarding)
- ✅ Password change confirmations
- 📦 Order confirmations (coming soon)
- 📋 Verification status updates (coming soon)

---

## Optional: SMTP Fallback (for scaling)

If you exceed Resend's free tier or want enterprise email service, the app automatically falls back to SMTP.

### Supported SMTP Providers
- Gmail (with app password)
- SendGrid
- AWS SES
- Mailgun
- Any SMTP server

### SMTP Setup (Optional)
Add these variables to `.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="AgriCompass" <noreply@agricompass.com>
```

### How Fallback Works
The email system tries services in this order:
1. **Resend** (if `RESEND_API_KEY` is set) → Fast, free, reliable
2. **SMTP** (if Resend fails or not configured) → Backup option
3. **Graceful skip** (if neither is configured) → App still works, just no emails

This ensures your app never crashes due to email issues!

---

## Testing Emails

### Development Testing
```bash
# Start the server
npm run dev

# Test password reset
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@example.com"}'

# Check terminal logs for:
# "Email sent via Resend to your-test-email@example.com"
```

### Production Monitoring
- Check Resend dashboard for delivery stats
- Review server logs for email errors
- Set up alerts for failed emails

---

## Cost Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| **Resend** | 3,000/month (100/day) | $20/mo for 50k emails |
| Gmail SMTP | 500/day (limited) | Free (with restrictions) |
| SendGrid | 100/day | $19.95/mo for 50k emails |
| AWS SES | 62,000/month (first year) | $0.10 per 1,000 emails |

**Recommendation**: Start with Resend (free), upgrade to SMTP/SendGrid when you hit 3,000 emails/month.

---

## Troubleshooting

### No emails being sent?
1. Check `.env` has `RESEND_API_KEY` set
2. Verify API key is valid at https://resend.com/api-keys
3. Check server logs for errors
4. Confirm `EMAIL_FROM` uses Resend's default domain initially

### Emails going to spam?
- For production, verify your own domain in Resend
- Add SPF/DKIM records (Resend provides these)
- Use a consistent "From" address

### Rate limiting?
- Free tier: 100 emails/day
- If you hit the limit, SMTP fallback will activate
- Upgrade to paid plan for higher limits

---

## Security Best Practices

✅ **Never commit** `.env` file to git  
✅ **Use environment variables** for all API keys  
✅ **Rotate API keys** every 90 days in production  
✅ **Enable HTTPS** before sending emails in production  
✅ **Monitor email logs** for suspicious activity  

---

## Need Help?

- Resend Documentation: https://resend.com/docs
- AgriCompass Issues: https://github.com/your-repo/issues
- Email me: support@agricompass.com
