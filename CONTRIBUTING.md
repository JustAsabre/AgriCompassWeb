# Contributing to AgriCompassWeb

Thank you for contributing to AgriCompassWeb! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project
- Show empathy towards other team members

## Getting Started

1. **Fork or clone the repository**
   ```bash
   git clone https://github.com/JustAsabre/AgriCompassWeb.git
   cd AgriCompassWeb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run type checking**
   ```bash
   npm run check
   ```

## Development Workflow

### Branch Strategy

We use a **Feature Branch Workflow**:

- `main` - Production-ready code (protected)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `improve/*` - Improvements and optimizations
- `docs/*` - Documentation updates

### Daily Workflow

```bash
# 1. Update main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and commit
git add .
git commit -m "Add: Your feature description"

# 4. Push to GitHub
git push origin feature/your-feature-name

# 5. Create Pull Request
# 6. After approval, merge and delete branch
```

### Handling Conflicts

```bash
# Update your branch with latest main
git checkout your-branch
git pull origin main

# Resolve conflicts in your editor
# Remove <<<, ===, >>> markers
# Test that everything works

git add .
git commit -m "Resolve merge conflicts"
git push origin your-branch
```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Define proper types, avoid `any`
- Use interfaces for object shapes
- Export shared types from `shared/schema.ts`

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
  return <div>{/* ... */}</div>;
}
```

### File Organization

- Components: `client/src/components/`
- Pages: `client/src/pages/`
- Utilities: `client/src/lib/`
- API routes: `server/routes.ts`
- Shared types: `shared/schema.ts`

### Naming Conventions

- **Components**: PascalCase (`ProductCard.tsx`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS Classes**: Tailwind utilities

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Add trailing commas
- Max line length: 100 characters (soft limit)

## Commit Guidelines

### Format

```
Type: Brief description

Detailed explanation (optional)
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

### Examples

```bash
✅ Good commits
git commit -m "Add: Product search filter component"
git commit -m "Fix: Cart total calculation with discounts"
git commit -m "Update: User profile schema with phone field"
git commit -m "Improve: Marketplace loading performance"

❌ Bad commits
git commit -m "fixed stuff"
git commit -m "changes"
git commit -m "asdfasdf"
```

## Pull Request Process

### Before Creating PR

- [ ] Test changes locally
- [ ] Run `npm run check` (no TypeScript errors)
- [ ] No console errors in browser
- [ ] Update documentation if needed
- [ ] Clear, descriptive commits

### Creating a Pull Request

1. Push your branch to GitHub
2. Go to repository and click "New Pull Request"
3. Select your branch
4. Fill in the PR template:
   - Description of changes
   - Type of change (bug fix, feature, etc.)
   - Testing done
   - Screenshots (if UI changes)
5. Request review from team members
6. Address feedback
7. Merge after approval

### After Merge

```bash
git checkout main
git pull origin main
git branch -d feature/your-feature  # Delete local branch
```

## Code Review Guidelines

### As a Reviewer

- Be kind and constructive
- Explain the "why" not just "what"
- Suggest improvements, don't demand
- Test changes if possible
- Approve if functional, even if minor improvements possible

### Receiving Feedback

- Don't take it personally
- Ask questions if unclear
- Discuss alternatives
- Make requested changes promptly
- Thank reviewers

## Testing

Before pushing:

```bash
# 1. Start dev server
npm run dev

# 2. Test in browser (http://localhost:5000)
# - Check functionality
# - Test different user roles
# - Try edge cases
# - Check mobile view
# - Look for console errors

# 3. Type check
npm run check
```

## Getting Help

- Check this documentation
- Ask in team discussions
- Open an issue for bugs
- Check existing issues/PRs

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

Thank you for contributing to AgriCompassWeb! 🚀

## Uploads

- **Field name**: When sending files to the API endpoint `POST /api/upload` the server expects the multipart form field name to be `images` (plural). The route uses `upload.array('images', 5)` so you can send up to 5 files in a single request.
- **Curl example**:

```powershell
# Authenticate and save cookie (example)
curl.exe -c cookiejar.txt -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"password"}' http://localhost:5000/api/auth/login

# Upload a single file (authenticated)
curl.exe -b cookiejar.txt -F "images=@server/tests/_tmp_upload.png" http://localhost:5000/api/upload
```

- **Notes**: keep the field name `images` to avoid `Unexpected field` errors from multer.
