# Hudson Dashboard Architecture

## Overview

A building dashboard application with an admin panel for managing services, events, and advisories. The dashboard displays real-time building information (HVAC, elevators, etc.) with a draft/publish workflow for content management.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express.js + TypeScript
- **Database:** SQLite via Prisma ORM
- **Real-time:** Server-Sent Events (SSE)

---

## Directory Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Initial data seeding
│
├── server/
│   ├── index.ts               # Express app entry point
│   ├── db.ts                  # Prisma client instance
│   ├── sse.ts                 # Server-Sent Events for real-time updates
│   ├── middleware/
│   │   └── errorHandler.ts    # Centralized error handling + asyncHandler
│   ├── routes/
│   │   ├── services.ts        # Building services CRUD
│   │   ├── events.ts          # Dashboard events CRUD
│   │   ├── advisories.ts      # Ticker advisories CRUD
│   │   ├── config.ts          # Building configuration
│   │   └── snapshots.ts       # Draft/publish workflow
│   └── utils/
│       └── createCrudRoutes.ts # Factory for generating CRUD routes
│
├── src/
│   ├── main.tsx               # React app entry point
│   ├── types.ts               # TypeScript type definitions (with JSDoc)
│   ├── pages/
│   │   ├── Dashboard.tsx      # Public-facing dashboard display
│   │   └── Admin.tsx          # Admin panel coordinator
│   ├── components/
│   │   ├── Header.tsx         # Dashboard header with logo/time
│   │   ├── ServiceTable.tsx   # Building services status table
│   │   ├── EventCard.tsx      # Individual event display card
│   │   ├── AdvisoryTicker.tsx # Scrolling advisory messages
│   │   └── admin/
│   │       ├── index.ts           # Barrel exports
│   │       ├── StatusSelect.tsx   # Service status dropdown
│   │       ├── ImagePicker.tsx    # Image URL selector
│   │       ├── MarkdownEditor.tsx # Markdown text editor
│   │       ├── EventCardPreview.tsx # Live event preview
│   │       ├── LabelPicker.tsx    # Event label selector
│   │       ├── SnapshotHistory.tsx # Version history UI
│   │       └── sections/
│   │           ├── index.ts           # Section barrel exports
│   │           ├── ConfigSection.tsx  # Building config editor
│   │           ├── ServicesSection.tsx # Services list manager
│   │           ├── EventsSection.tsx   # Events list manager
│   │           └── AdvisoriesSection.tsx # Advisories manager
│   ├── constants/
│   │   ├── index.ts           # Barrel exports
│   │   ├── config.ts          # Design tokens + app constants
│   │   └── status.ts          # Service status definitions
│   ├── styles/
│   │   ├── index.ts           # Barrel exports
│   │   ├── buttons.ts         # Shared button styles
│   │   └── modal.ts           # Modal dialog styles
│   └── utils/
│       ├── api.ts             # API client with error handling
│       └── markdown.ts        # Markdown parsing utilities
```

---

## Key Patterns

### 1. Draft/Publish Workflow

The admin panel uses a staging workflow where changes aren't immediately visible on the public dashboard:

1. **Draft State:** Changes are made in the admin UI
2. **Soft Delete:** Items marked for deletion have `markedForDeletion: true` (NOT physically deleted)
3. **Publish:** Creates a snapshot, applies deletions, clears `markedForDeletion` flags
4. **Discard:** Reverts all unpublished changes to last published state

**IMPORTANT:** Use `markedForDeletion` field, NOT `deletedAt`. The codebase only uses soft delete via the boolean flag.

### 2. CRUD Route Factory

All entity routes (services, events, advisories) use `createCrudRoutes()` factory:

```typescript
// server/routes/services.ts
export default createCrudRoutes<Service>({
  model: 'service',
  orderBy: { sortOrder: 'asc' },
});
```

The factory generates: `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/unmark`

For custom field handling (like events.details JSON):
```typescript
export default createCrudRoutes<Event>({
  model: 'event',
  transformCreate: (data) => ({ ...data, details: JSON.stringify(data.details) }),
  transformGet: (item) => ({ ...item, details: JSON.parse(item.details) }),
});
```

### 3. Error Handling

All async route handlers use `asyncHandler()` wrapper:

```typescript
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await prisma.service.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('Service not found');
  res.json(item);
}));
```

Error types:
- `ValidationError` (400) - Invalid input
- `NotFoundError` (404) - Resource doesn't exist
- Generic errors become 500 responses

### 4. Component Documentation Standard

All extracted components include this header format:

```typescript
/**
 * ComponentName - Brief description of purpose.
 *
 * GOTCHAS / AI AGENT NOTES:
 * - Important implementation details
 * - Non-obvious behaviors
 *
 * RELATED FILES:
 * - path/to/related/file.ts - What it does
 */
```

---

## Data Flow

### Dashboard (Public View)
```
Dashboard.tsx
    ↓ fetch /api/snapshots/current
    ↓ (or SSE stream for real-time)
    ↓
┌───────────────────────────────┐
│  Published snapshot data      │
│  - services[]                 │
│  - events[]                   │
│  - advisories[]               │
│  - config                     │
└───────────────────────────────┘
    ↓
Header + ServiceTable + EventCards + AdvisoryTicker
```

### Admin Panel
```
Admin.tsx
    ↓ fetch /api/services, /api/events, /api/advisories, /api/config
    ↓ fetch /api/snapshots/draft-status
    ↓
┌───────────────────────────────┐
│  Draft state (unpublished)    │
│  + comparison to published    │
│  = shows "changed" indicators │
└───────────────────────────────┘
    ↓
ConfigSection + ServicesSection + EventsSection + AdvisoriesSection
    ↓
Publish → POST /api/snapshots → Creates new snapshot
```

---

## Database Schema (Key Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Service` | Building systems (HVAC, elevators) | name, status, sortOrder, markedForDeletion |
| `Event` | Dashboard announcement cards | title, details (JSON string), imageUrl, label |
| `Advisory` | Ticker messages | text, markedForDeletion |
| `BuildingConfig` | Global settings | buildingName, logoUrl, etc. |
| `Snapshot` | Published state versions | version, state (JSON), publishedAt |

**GOTCHA:** `Event.details` is stored as a JSON string in the database but exposed as `string[]` via the API. The route transforms handle serialization.

---

## Common Tasks

### Adding a New Admin Section

1. Create section component in `src/components/admin/sections/NewSection.tsx`
2. Export from `src/components/admin/sections/index.ts`
3. Add to `Admin.tsx` imports and render

### Adding a New API Route

For standard CRUD:
```typescript
// server/routes/newEntity.ts
import { createCrudRoutes } from '../utils/createCrudRoutes.js';
export default createCrudRoutes({ model: 'newEntity' });
```

Then register in `server/index.ts`:
```typescript
import newEntityRoutes from './routes/newEntity.js';
app.use('/api/new-entity', newEntityRoutes);
```

### Adding a New Service Status

1. Add to `src/constants/status.ts`
2. Update `StatusSelect.tsx` if custom styling needed

---

## Gotchas for AI Agents

1. **Auto-scroll requires fractional pixel accumulation** - See CLAUDE.md for details
2. **`markedForDeletion` NOT `deletedAt`** - Soft delete uses boolean flag only
3. **Events.details is JSON string in DB** - API transforms to/from `string[]`
4. **Preview mode** - Dashboard accepts `?preview=true` to show draft state
5. **SSE notifications** - `server/sse.ts` broadcasts on publish for real-time updates
6. **All routes need asyncHandler** - Use factory or wrap manually for error handling
