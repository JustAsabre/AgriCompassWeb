# Contributing to AgriCompassWeb

First off, thank you for considering contributing to AgriCompassWeb! 🎉

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project
- Show empathy towards other team members

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a new branch: `git checkout -b feature/your-feature`
4. Start development server: `npm run dev`

## Development Workflow

### Branch Strategy

We use **Feature Branch Workflow**:

- `main` - Production-ready code (always stable)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `improve/*` - Improvements and optimizations
- `docs/*` - Documentation updates

### Daily Workflow

```bash
# 1. Update your local main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and commit
git add .
git commit -m "Add: Your feature description"

# 4. Push to GitHub
git push origin feature/your-feature-name

# 5. Create Pull Request on GitHub
# 6. Wait for review and approval
# 7. Merge to main
```

### Working on Multiple Features

If you need to switch between features:

```bash
# Save current work
git stash

# Switch to other branch
git checkout other-feature

# When returning
git checkout your-feature
git stash pop
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types, avoid `any`
- Use interfaces for object shapes
- Export types from `shared/schema.ts`

```typescript
// ✅ Good
interface UserProfile {
  name: string;
  email: string;
  role: 'farmer' | 'buyer' | 'field_officer';
}

// ❌ Avoid
const user: any = { ... };
```

### React Components

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components focused and small
- Use TypeScript for props

```typescript
// ✅ Good
interface ProductCardProps {
  title: string;
  price: number;
  onAddToCart: () => void;
}

export function ProductCard({ title, price, onAddToCart }: ProductCardProps) {
  return (
    // ...
  );
}
```

### File Organization

- Components in `client/src/components/`
- Pages in `client/src/pages/`
- Utilities in `client/src/lib/`
- API routes in `server/routes.ts`
- Shared types in `shared/schema.ts`

### Naming Conventions

- **Components**: PascalCase (`ProductCard.tsx`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Files**: kebab-case (`user-profile.tsx`) or PascalCase for components
- **CSS Classes**: Tailwind utility classes

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Add trailing commas in objects/arrays
- Max line length: 100 characters (soft limit)

```typescript
// ✅ Good
const user = {
  name: 'John',
  email: 'john@example.com',
};

// ❌ Avoid
const user = {
  name: "John",
  email: "john@example.com"
}
```

## Pull Request Process

### Before Creating PR

1. ✅ Test your changes locally
2. ✅ Run type checking: `npm run check`
3. ✅ Ensure no console errors
4. ✅ Update documentation if needed
5. ✅ Commit with clear messages
6. ✅ Push your branch

### Creating a Pull Request

1. Go to https://github.com/JustAsabre/AgriCompassWeb
2. Click "Pull requests" → "New pull request"
3. Select your branch
4. Fill in the PR template:

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Improvement
- [ ] Documentation

## Changes Made
- Added X component
- Fixed Y bug
- Improved Z performance

## Testing
- [ ] Tested locally
- [ ] No console errors
- [ ] Works in Chrome/Firefox/Safari
- [ ] Mobile responsive

## Screenshots (if applicable)
[Add screenshots]

## Related Issues
Closes #[issue number]
```

5. Request review from team members
6. Address review feedback
7. Merge after approval

### After PR is Merged

```bash
# Switch to main
git checkout main

# Pull latest changes
git pull origin main

# Delete feature branch (optional)
git branch -d feature/your-feature
```

## Commit Message Guidelines

### Format

```
Type: Brief description (max 50 chars)

Optional detailed explanation (wrap at 72 chars)
```

### Types

- `Add:` - New feature or functionality
- `Fix:` - Bug fix
- `Update:` - Update existing feature
- `Remove:` - Remove code or feature
- `Improve:` - Performance or code improvement
- `Refactor:` - Code refactoring
- `Docs:` - Documentation changes
- `Style:` - Code style changes (formatting)
- `Test:` - Adding or updating tests

### Examples

```bash
# Good commits
git commit -m "Add: Product search filter component"
git commit -m "Fix: Cart total calculation when applying discounts"
git commit -m "Update: User profile schema with new fields"
git commit -m "Improve: Marketplace loading performance"
git commit -m "Docs: Add API endpoint documentation"

# Bad commits
git commit -m "fixed stuff"
git commit -m "changes"
git commit -m "idk"
git commit -m "asdfasdf"
```

### Detailed Commit Messages

For complex changes:

```bash
git commit -m "Add: Advanced product filtering system

- Implemented multi-criteria filtering
- Added price range slider
- Created category selection component
- Optimized query performance

Closes #42"
```

## Code Review Guidelines

### As a Reviewer

- Be kind and constructive
- Explain the "why" not just "what"
- Suggest improvements, don't demand
- Approve if it works, even if you'd do it differently
- Test the changes if possible

### Receiving Feedback

- Don't take it personally
- Ask questions if unclear
- Discuss alternatives
- Thank reviewers
- Make requested changes promptly

## Testing Your Changes

Before pushing:

```bash
# 1. Start dev server
npm run dev

# 2. Test in browser
# - Check functionality works
# - Test different user roles
# - Try edge cases
# - Check mobile view
# - Look for console errors

# 3. Type check
npm run check
```

## Common Git Issues

### Merge Conflicts

```bash
# 1. Update your branch with main
git checkout your-branch
git merge main

# 2. Resolve conflicts in files
# Edit files, remove conflict markers

# 3. Add resolved files
git add .

# 4. Complete the merge
git commit -m "Resolve merge conflicts with main"
```

### Accidentally Committed to Main

```bash
# 1. Create a new branch from current state
git branch feature/saved-work

# 2. Reset main to origin
git checkout main
git reset --hard origin/main

# 3. Switch to your new branch
git checkout feature/saved-work
```

### Undo Last Commit (Keep Changes)

```bash
git reset --soft HEAD~1
```

### Undo Changes to File

```bash
# Before committing
git checkout -- filename

# After committing
git revert commit-hash
```

## Questions?

- Ask in team chat
- Open a GitHub Issue
- Check existing documentation
- Consult with team lead

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

Happy coding! 🚀
