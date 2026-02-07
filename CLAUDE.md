# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Change Workflow

**For EVERY code change**, follow this workflow:

### 1. Work in a Git Worktree

Do NOT work directly on main. Create a worktree branch for your change:

```bash
git worktree add ../77-hudson-dashboard-<short-description> -b <branch-name>
cd ../77-hudson-dashboard-<short-description>
npm ci  # install deps in the worktree
```

When done, merge back to main and clean up:

```bash
cd /Users/gmecocci/projects/77-hudson-dashboard
git merge <branch-name>
git push
git worktree remove ../77-hudson-dashboard-<short-description>
git branch -d <branch-name>
```

### 2. Monitor Render Deployment After Push

After every `git push` to main, you MUST monitor the Render deployment and display a progress bar to the user:

1. Get the latest deploy: `list_deploys(serviceId: "srv-d63big0gjchc738v1irg", limit: 1)`
2. Poll `get_deploy` every ~15-20 seconds
3. Display progress using this format:
   - `build_in_progress` → `███░░░░░░░ Building...`
   - `update_in_progress` → `█████████░ Deploying...`
   - `live` → `██████████ Live!`
   - `build_failed` / `update_failed` / `deactivated` → report the failure
4. Keep polling until status is `live` or a failure state

**Render service ID:** `srv-d63big0gjchc738v1irg`
**Live URL:** https://seven7-hudson-dashboard.onrender.com

---

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

Use 'bd' for task tracking

---

> **See also:** [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview and directory structure.

## Development Guide Quick Reference

| Task | Guide |
|------|-------|
| Add new admin section | [How to Add an Admin Section](#how-to-add-an-admin-section) |
| Add new API route | [How to Add an API Route](#how-to-add-an-api-route) |
| Error handling | [Error Handling Pattern](#error-handling-pattern) |
| Auto-scroll fix | [Auto-Scrolling Implementation](#auto-scrolling-implementation-dashboardtsx) |

---

## How to Add an Admin Section

1. **Create the section component:**
   ```typescript
   // src/components/admin/sections/NewSection.tsx
   /**
    * NewSection - Manages [entity] in the admin panel.
    *
    * GOTCHAS / AI AGENT NOTES:
    * - List any non-obvious behaviors here
    *
    * RELATED FILES:
    * - server/routes/newEntity.ts - Backend API
    * - src/types.ts - Type definitions
    */
   interface Props {
     items: NewEntity[];
     onSave: () => Promise<void>;
     hasChanged: boolean;
   }

   export function NewSection({ items, onSave, hasChanged }: Props) {
     // Implementation...
   }
   ```

2. **Export from barrel file:**
   ```typescript
   // src/components/admin/sections/index.ts
   export { NewSection } from './NewSection';
   ```

3. **Add to Admin.tsx:**
   ```typescript
   import { NewSection } from '../components/admin/sections';
   // In component:
   <NewSection items={items} onSave={onSave} hasChanged={sectionChanges.newEntity} />
   ```

---

## How to Add an API Route

### For Standard CRUD (recommended)

Use the factory pattern:

```typescript
// server/routes/newEntity.ts
/**
 * NewEntity API Routes - CRUD operations for [description].
 *
 * ROUTES:
 * - GET /api/new-entity - List all
 * - POST /api/new-entity - Create
 * - PUT /api/new-entity/:id - Update
 * - DELETE /api/new-entity/:id - Mark for deletion
 * - POST /api/new-entity/:id/unmark - Undo mark for deletion
 */
import { createCrudRoutes } from '../utils/createCrudRoutes.js';
import type { NewEntity } from '@prisma/client';

export default createCrudRoutes<NewEntity>({
  model: 'newEntity',
  orderBy: { sortOrder: 'asc' },  // optional
});
```

Register in `server/index.ts`:
```typescript
import newEntityRoutes from './routes/newEntity.js';
app.use('/api/new-entity', newEntityRoutes);
```

### With Field Transforms (for JSON fields, etc.)

```typescript
export default createCrudRoutes<Event>({
  model: 'event',
  orderBy: { sortOrder: 'asc' },
  transformCreate: (data) => ({
    ...data,
    details: JSON.stringify(data.details || []),
  }),
  transformUpdate: (data) => ({
    ...data,
    ...(data.details !== undefined && { details: JSON.stringify(data.details) }),
  }),
  transformGet: (item) => ({
    ...item,
    details: JSON.parse(item.details),
  }),
});
```

### For Custom Routes

```typescript
import { Router } from 'express';
import { asyncHandler, NotFoundError, validateId } from '../middleware/errorHandler.js';
import prisma from '../db.js';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
  const id = validateId(req.params.id);
  const item = await prisma.newEntity.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('Entity not found');
  res.json(item);
}));

export default router;
```

---

## Error Handling Pattern

**Always wrap async handlers with `asyncHandler()`:**

```typescript
import { asyncHandler, NotFoundError, ValidationError, validateId } from '../middleware/errorHandler.js';

// In route handler:
router.post('/', asyncHandler(async (req, res) => {
  const { name, value } = req.body;

  // Validation
  if (!name) throw new ValidationError('Name is required');

  // Not found
  const parent = await prisma.parent.findUnique({ where: { id } });
  if (!parent) throw new NotFoundError('Parent not found');

  // Success
  const item = await prisma.entity.create({ data: { name, value } });
  res.status(201).json(item);
}));
```

**Error types:**
- `ValidationError` → 400 Bad Request
- `NotFoundError` → 404 Not Found
- Unhandled errors → 500 Internal Server Error

---

## Auto-Scrolling Implementation (Dashboard.tsx)

**DO NOT BREAK THE SCROLLING AGAIN!**

The events auto-scroll in `AutoScrollCards` component requires specific CSS and JS patterns:

### CSS Requirements
1. **Wrapper must be `position: relative`** with `flex: 1` and `minHeight: 0`
2. **Scroll container must be `position: absolute`** with `top/left/right/bottom: 0`
3. This gives the scroll container a definite height, which is required for `overflow: auto` to work inside flexbox

### JS Requirements
1. **Accumulate fractional pixels** - browsers ignore sub-pixel `scrollTop` values
2. **Only scroll when accumulated >= 1px** - use `Math.floor()` to get whole pixels
3. **Use `scrollBy({ top, behavior: 'instant' })`** - not direct `scrollTop` assignment
4. Content is duplicated (`[...events, ...events]`) for seamless looping
5. When `scrollTop >= contentHeight/2`, jump back by subtracting `contentHeight`

### Why This Matters
Without these patterns, `scrollTop` will stay at 0 even though manual scrolling works. The browser silently rejects the scroll attempts.

---

## Common Gotchas

| Issue | Solution |
|-------|----------|
| `markedForDeletion` vs `deletedAt` | Only use `markedForDeletion` boolean - no `deletedAt` in schema |
| Events.details type mismatch | Stored as JSON string in DB, exposed as `string[]` via API |
| Preview mode | Dashboard accepts `?preview=true` query param for draft state |
| SSE updates | Publish triggers real-time updates via `server/sse.ts` |
| Snapshots API | See `server/routes/snapshots.ts` header for draft/publish workflow |
