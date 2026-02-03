# 77 Hudson Dashboard

A digital signage dashboard for residential building lobbies. Displays real-time service status, upcoming events, and scrolling advisories on lobby screens.

**Features:**
- Service status board (Operational/Maintenance/Outage)
- Event cards with images and markdown details
- Scrolling advisory ticker
- Admin UI with draft/publish workflow
- Real-time updates via SSE

## Quickstart

Requires Node.js 18+.

```bash
git clone <repo-url> && cd hudson-dashboard
./run.sh
```

This installs deps, sets up the SQLite database, seeds sample data, and starts the server.

- **Dashboard** (TV display): http://localhost:3000
- **Admin panel**: http://localhost:3000/admin

The dashboard auto-refreshes every 15 seconds.

## Using the Admin Page

Navigate to `/admin`. There are four sections:

**Building Config** — Set the building number, name, and subtitle shown in the header.

**Services** — These appear in the status table on the dashboard.
- Add a service with a name and initial status (Operational / Maintenance / Outage).
- Click the status badge on an existing service to cycle through states.
- Click **✕** to delete.

**Events** — These are the announcement cards on the right side of the dashboard.
- Fill in title, subtitle, accent color, optional image URL, and details (one bullet point per line).
- Click **✕** to delete.

**Advisories** — The yellow scrolling banner at the bottom.
- Add with a label (e.g. "RESIDENT ADVISORY") and message text.
- Toggle **ON/OFF** to show or hide without deleting.
- Click **✕** to delete.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express (serves API + Vite dev middleware in one process)
- **Database**: SQLite via Prisma ORM

## Project Structure

```
server/
  index.ts          # Express server, Vite middleware, seed logic
  db.ts             # Prisma client
  routes/           # REST endpoints for each model
src/
  pages/
    Dashboard.tsx   # TV-facing display
    Admin.tsx       # Content management
  components/       # Header, ServiceTable, EventCard, AdvisoryTicker
prisma/
  schema.prisma     # Data models
```

## Contributing

### Setup

```bash
npm install
npx prisma db push    # creates/updates SQLite DB
npm run dev           # starts on :3000 with hot reload
```

### Data model changes

Edit `prisma/schema.prisma`, then:

```bash
npx prisma db push
```

Prisma generates types automatically — the API routes and frontend pick them up.

### API routes

Routes live in `server/routes/`. Each file exports an Express router with standard CRUD. Add new routes there and register them in `server/index.ts`.

### Frontend

React components are in `src/components/`. Pages are in `src/pages/`. Styling uses inline style objects — no CSS framework. Keep the teal/dark theme consistent (`#00bcd4` teal, `#0a1628` background, `#132038` cards).

### Adding a new data type

1. Add model to `prisma/schema.prisma`
2. Run migration
3. Create `server/routes/yourmodel.ts` with CRUD
4. Register in `server/index.ts`
5. Add types to `src/types.ts`
6. Build UI components and wire them into Dashboard/Admin
