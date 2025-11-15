# 🚀 Quick Reference Card - Print & Keep Handy!

## Git Commands You'll Use Every Day

```bash
# START OF DAY
git checkout main           # Switch to main branch
git pull origin main        # Get latest code

# START NEW WORK
git checkout -b feature/name    # Create new branch

# WHILE WORKING
npm run dev                 # Start server (http://localhost:5000)
git status                  # See what changed
git add .                   # Stage all changes
git commit -m "Type: Description"   # Save changes
git push origin branch-name # Upload to GitHub

# AFTER PR MERGED
git checkout main           # Back to main
git pull origin main        # Get updates
git branch -d feature/name  # Delete old branch
```

---

## Commit Message Template

```
Type: Brief description

Types:
Add    - New feature
Fix    - Bug fix
Update - Modify existing
Improve - Enhancement
Remove - Delete code
Docs   - Documentation

Examples:
✅ git commit -m "Add: Search filter component"
✅ git commit -m "Fix: Cart total calculation"
✅ git commit -m "Improve: Mobile responsiveness"
```

---

## Branch Naming

```
feature/  - New features
fix/      - Bug fixes
improve/  - Improvements
docs/     - Documentation

Examples:
✅ feature/add-payment-page
✅ fix/login-error
✅ improve/ui-mobile
```

---

## Emergency Commands

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes (CAREFUL!)
git reset --hard origin/main

# Save work without committing
git stash
git stash pop  # restore later

# Fix "committed to main"
git branch feature/saved
git checkout main
git reset --hard origin/main
git checkout feature/saved
```

---

## Pull Request Checklist

Before creating PR:
- [ ] Tested locally
- [ ] No console errors
- [ ] Clear commit messages
- [ ] Pulled latest main
- [ ] Resolved conflicts

---

## Daily Routine

**Morning:**
1. Pull main
2. Create branch
3. Start dev server

**During:**
1. Code
2. Test
3. Commit often
4. Push regularly

**Evening:**
1. Push final changes
2. Create PR if done
3. Review others' PRs

---

## Team Communication

**Starting work:**
"Working on [feature] today"

**Need help:**
"Stuck on [problem], anyone free?"

**Finished:**
"PR ready: [feature], please review"

**Found bug:**
"Found bug in [area], creating issue"

---

## Repository Info

**URL:** https://github.com/JustAsabre/AgriCompassWeb

**Local Port:** http://localhost:5000

**Main Docs:**
- README.md - Full documentation
- TEAM_GUIDE.md - Collaboration guide
- TUTORIAL.md - Step-by-step tutorial
- CONTRIBUTING.md - Detailed guidelines

---

## Testing Accounts

| Role | Email |
|------|-------|
| Farmer | farmer1@test.com |
| Farmer | farmer2@test.com |
| Buyer | buyer@test.com |
| Officer | officer@test.com |

---

## Common Errors & Fixes

**"Updates were rejected"**
→ `git pull origin main` first

**"Merge conflicts"**
→ Open files, resolve <<<>>>, commit

**"Node modules error"**
→ `npm install` again

**"Port 5000 in use"**
→ Stop other servers or change port

---

## File Structure

```
client/src/
  ├── components/  - UI components
  ├── pages/      - Page views
  ├── lib/        - Utilities
  └── hooks/      - Custom hooks

server/
  ├── index.ts    - Server entry
  ├── routes.ts   - API endpoints
  └── auth.ts     - Authentication

shared/
  └── schema.ts   - Database types
```

---

## Need Help?

1. Check TUTORIAL.md
2. Ask teammate
3. Search documentation
4. Google the error
5. Create GitHub issue

---

**Remember: We're a team! 🚀**

*Last updated: Nov 2025*
