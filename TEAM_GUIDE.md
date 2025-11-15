# 👥 Team Collaboration Quick Guide

> **Quick reference for the 4-person team working on AgriCompassWeb**

## 🚀 Quick Start (First Time Setup)

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/JustAsabre/AgriCompassWeb.git
cd AgriCompassWeb
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Git
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 4️⃣ Run the Project
```bash
npm run dev
```
Open http://localhost:5000 in your browser

---

## 📅 Daily Workflow

### Morning Routine (EVERY DAY!)
```bash
# 1. Update your local code
git checkout main
git pull origin main
```

### Starting New Work
```bash
# 2. Create a new branch for your feature
git checkout -b feature/your-feature-name

# Branch naming examples:
# feature/add-payment-page
# fix/cart-not-updating
# improve/ui-mobile-view
# docs/update-readme
```

### While Working
```bash
# 3. Start development server
npm run dev

# 4. Make changes to files...
# 5. Test your changes in browser (http://localhost:5000)
```

### Saving Your Work
```bash
# 6. Check what you changed
git status

# 7. Add your changes
git add .
# OR add specific files
git add src/components/YourComponent.tsx

# 8. Commit with clear message
git commit -m "Add: Description of what you did"

# Commit message examples:
# git commit -m "Add: Payment integration page"
# git commit -m "Fix: Cart not updating total price"
# git commit -m "Improve: Mobile menu navigation"

# 9. Push to GitHub
git push origin feature/your-feature-name
```

### Creating Pull Request (PR)
```bash
# 10. Go to GitHub: https://github.com/JustAsabre/AgriCompassWeb
# 11. Click "Pull requests" → "New pull request"
# 12. Select your branch
# 13. Fill in title and description
# 14. Click "Create pull request"
# 15. Request review from team members
# 16. Wait for approval
```

### After PR Approved and Merged
```bash
# 17. Clean up
git checkout main
git pull origin main
git branch -d feature/your-feature-name  # Delete local branch
```

---

## 🔥 Common Scenarios

### Scenario 1: Starting a New Feature
```bash
git checkout main
git pull origin main
git checkout -b feature/my-new-feature
# ... make changes ...
git add .
git commit -m "Add: My new feature"
git push origin feature/my-new-feature
# Create PR on GitHub
```

### Scenario 2: Fixing a Bug
```bash
git checkout main
git pull origin main
git checkout -b fix/bug-description
# ... fix the bug ...
git add .
git commit -m "Fix: Bug description"
git push origin fix/bug-description
# Create PR on GitHub
```

### Scenario 3: Need to Switch Tasks
```bash
# Save current work without committing
git stash

# Switch to other branch
git checkout other-branch

# Later, return to original branch
git checkout original-branch
git stash pop  # Restore saved work
```

### Scenario 4: Your Code Conflicts with Main
```bash
# Pull latest main into your branch
git checkout your-branch
git pull origin main

# If conflicts appear:
# 1. Open conflicted files
# 2. Look for <<<<<<< HEAD markers
# 3. Decide which code to keep
# 4. Remove conflict markers
# 5. Save file

git add .
git commit -m "Resolve merge conflicts"
git push origin your-branch
```

### Scenario 5: Made Changes to Wrong Branch
```bash
# Save changes
git stash

# Switch to correct branch
git checkout correct-branch

# Apply changes
git stash pop
```

---

## 📋 Git Commands Cheat Sheet

### Essential Commands
```bash
# See current status
git status

# See all branches
git branch

# Create and switch to new branch
git checkout -b branch-name

# Switch to existing branch
git checkout branch-name

# Add all changes
git add .

# Add specific file
git add path/to/file

# Commit changes
git commit -m "Type: Description"

# Push to GitHub
git push origin branch-name

# Pull latest from GitHub
git pull origin main

# See recent commits
git log --oneline

# Temporarily save changes
git stash
git stash pop

# Discard changes to file (CAREFUL!)
git checkout -- filename
```

---

## 🎯 Team Roles & Responsibilities

### Everyone's Responsibilities
- ✅ Pull latest code EVERY morning
- ✅ Create branch for EVERY change
- ✅ Test before pushing
- ✅ Write clear commit messages
- ✅ Review others' PRs
- ✅ Communicate with team

### Suggested Division (Adjust as needed)

**Developer 1: Frontend UI/UX**
- Landing page
- Marketplace UI
- Product detail pages
- General styling

**Developer 2: Farmer Features**
- Farmer dashboard
- Create listing page
- Manage listings
- Farmer orders view

**Developer 3: Buyer Features**
- Buyer dashboard
- Shopping cart
- Checkout process
- Order tracking

**Developer 4: Authentication & Admin**
- Login/Register
- Field officer dashboard
- User verification
- Profile management

---

## ✅ Commit Message Guide

### Format
```
Type: Brief description

Types:
- Add: New feature
- Fix: Bug fix
- Update: Modify existing feature
- Improve: Enhancement
- Remove: Delete code
- Docs: Documentation
```

### Examples
```bash
✅ GOOD:
git commit -m "Add: Product search filter"
git commit -m "Fix: Cart total calculation error"
git commit -m "Improve: Mobile menu responsiveness"
git commit -m "Update: User profile schema"

❌ BAD:
git commit -m "changes"
git commit -m "fixed stuff"
git commit -m "idk"
git commit -m "test"
```

---

## 🚨 Important Rules

### DO ✅
- **ALWAYS** pull before starting work
- **ALWAYS** create a new branch
- **ALWAYS** test locally before pushing
- **ALWAYS** write clear commit messages
- **ALWAYS** review team PRs
- **ALWAYS** ask if unsure

### DON'T ❌
- **NEVER** push directly to main
- **NEVER** commit without testing
- **NEVER** commit node_modules
- **NEVER** commit .env files
- **NEVER** force push (`git push -f`)
- **NEVER** work on main branch

---

## 🆘 When Things Go Wrong

### "I committed to main by accident!"
```bash
# Create branch from current state
git branch feature/saved-work

# Reset main
git checkout main
git reset --hard origin/main

# Continue on new branch
git checkout feature/saved-work
```

### "I need to undo my last commit!"
```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes and commit (CAREFUL!)
git reset --hard HEAD~1
```

### "I have merge conflicts!"
```bash
# 1. Open conflicted files
# 2. Find sections with <<<<<<< and >>>>>>>
# 3. Choose which code to keep
# 4. Remove conflict markers
# 5. Save file

git add .
git commit -m "Resolve merge conflicts"
```

### "I messed up everything!"
```bash
# Discard ALL local changes (CAREFUL!)
git reset --hard origin/main

# OR ask team for help!
```

---

## 📞 Communication

### Before You Start
- 💬 "I'm working on [feature]"
- 💬 "I'll create the [component] today"

### When You Push
- 💬 "PR ready for [feature], please review"
- 💬 "Pushed fix for [bug]"

### When You're Stuck
- 💬 "Need help with [problem]"
- 💬 "Does anyone know how to [question]?"

### PR Reviews
- 💬 "Looks good! ✅"
- 💬 "Small suggestion: [feedback]"
- 💬 "Question: why did you [question]?"

---

## 🎓 Learning Resources

### Git Basics
- [Git Tutorial](https://www.atlassian.com/git/tutorials)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Understanding Branches](https://learngitbranching.js.org/)

### React & TypeScript
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Project Specific
- README.md - Project overview
- CONTRIBUTING.md - Detailed contribution guide

---

## 📊 Workflow Visualization

```
Team Member Daily Flow:
┌─────────────────────────────────────────┐
│ 1. Pull latest main                     │
│    git checkout main                    │
│    git pull origin main                 │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 2. Create feature branch                │
│    git checkout -b feature/my-feature   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 3. Make changes & test                  │
│    npm run dev                          │
│    Edit files...                        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 4. Commit changes                       │
│    git add .                            │
│    git commit -m "Add: Feature"         │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 5. Push to GitHub                       │
│    git push origin feature/my-feature   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 6. Create Pull Request                  │
│    On GitHub website                    │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 7. Team reviews & approves              │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 8. Merge to main                        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 9. Back to step 1 for next feature      │
└─────────────────────────────────────────┘
```

---

## 🎉 Tips for Success

1. **Communicate often** - Share what you're working on
2. **Pull frequently** - Stay up to date with team changes
3. **Commit small** - Small, focused commits are easier to review
4. **Test thoroughly** - Don't push broken code
5. **Help teammates** - Review PRs, answer questions
6. **Ask questions** - No question is too small
7. **Have fun!** - We're building something cool together!

---

**Remember: We're a team! Help each other succeed! 🚀**

For detailed information, see:
- **README.md** - Full project documentation
- **CONTRIBUTING.md** - Detailed contribution guidelines

**Repository**: https://github.com/JustAsabre/AgriCompassWeb
