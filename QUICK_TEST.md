# Quick Start - Email Testing

## 1. Setup Gmail SMTP (5 minutes)

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to: https://myaccount.google.com/security
2. Click **"2-Step Verification"**
3. Follow the setup (usually phone verification)
4. ✅ Enable 2FA

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **"Mail"**
3. Select device: **"Other (Custom name)"**
4. Type: **"AgriCompass"**
5. Click **"Generate"**
6. 📋 **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Configure .env

Open the `.env` file and update:

```bash
# Email Configuration - Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-gmail@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM="AgriCompass" <your-actual-gmail@gmail.com>

# Other settings
FRONTEND_URL=http://localhost:5000
SESSION_SECRET=agricompass-dev-secret
```

**Replace:**
- `your-actual-gmail@gmail.com` → Your Gmail address (e.g., `rasabre211@gmail.com`)
- `abcdefghijklmnop` → Your 16-char app password from Step 2 (remove spaces)

## 2. Start Server

```bash
npm install
npm run dev
```

## 3. Test Checklist

### ✅ Test 1: Welcome Email (2 min)
1. Go to: http://localhost:5000
2. Register with YOUR real email
3. Check inbox for welcome email

**Expected**: Welcome email received ✉️

---

### ✅ Test 2: Password Reset (3 min)
1. Click "Forgot Password?"
2. Enter your email
3. Check inbox for reset link
4. Click link and set new password
5. Check inbox for confirmation

**Expected**: 2 emails received ✉️✉️

---

### ✅ Test 3: Order Emails (5 min)
1. Register as Farmer with `farmer@test.com`
2. Create a product listing
3. Logout, register as Buyer with `buyer@test.com`
4. Add product to cart → Checkout
5. Check BOTH inboxes

**Expected**: 2 emails (buyer confirmation + farmer notification) ✉️✉️

---

### ✅ Test 4: Verification Email (4 min)
1. Register as Field Officer with `officer@test.com`
2. Login as Farmer → Request verification
3. Login as Officer → Approve/Reject verification
4. Check farmer's inbox

**Expected**: Verification status email ✉️

---

## Terminal Logs

**Success**:
```
Email sent via SMTP to user@example.com
```

**Error**:
```
SMTP failed: [reason]
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No emails | Check spam, verify app password |
| "Invalid login" | Regenerate app password, check 2FA enabled |
| "No email service configured" | Update SMTP_USER and SMTP_PASS in `.env` |
| Server error | Restart: `npm run dev` |

---

## Email Summary

| Action | Emails Sent | Recipients |
|--------|-------------|------------|
| Register | 1 | New user |
| Password Reset | 2 | User (reset link + confirmation) |
| Place Order | 2 | Buyer + Farmer |
| Verification | 1 | Farmer |

**Total**: 6 email types tested ✅

---

## See Full Details

📖 Read: **TESTING_GUIDE.md** for complete testing scenarios
📧 Read: **EMAIL_SETUP.md** for configuration details

---

## Success Criteria

✅ All 4 tests pass  
✅ Emails arrive within 30 seconds  
✅ Email templates look professional  
✅ No console errors  

---

Happy Testing! 🎉
