# 77 Hudson Dashboard

A digital signage dashboard for residential building lobbies. Displays real-time service status, upcoming events, and scrolling advisories on lobby screens.

## Features

- **Service Status Board** — Track building services (Operational/Maintenance/Outage)
- **Event Cards** — Announcements with images and markdown-formatted details
- **Advisory Ticker** — Scrolling yellow banner for important notices
- **Admin UI** — Draft/publish workflow with version history
- **Real-time Updates** — Server-sent events for instant refresh

## Quick Start

Requires Node.js 18+.

```bash
./run.sh
```

This installs dependencies, sets up the SQLite database with sample data, and starts the server.

- **Dashboard** (lobby display): http://localhost:3000
- **Admin panel**: http://localhost:3000/admin

### Reset to Default Data

```bash
./run.sh --reset
```

This clears the database and seeds it with sample services, events, and advisories.

## Admin Guide

Navigate to `/admin` to manage content. Changes are saved as drafts until published.

### Building Config
Set the building number, name, and subtitle shown in the header.

### Services
The status table on the main dashboard.
- Add services with name and status (Operational / Maintenance / Outage)
- Add optional notes for context
- Click status badge to change state
- Use "Just Checked" to update the timestamp

### Events
Announcement cards displayed on the dashboard.
- Add title, subtitle, and details (markdown supported)
- Select a preset image or upload your own
- Cards auto-scroll when content overflows

### Advisories
The yellow scrolling ticker at the bottom.
- Add with label (e.g., "RESIDENT ADVISORY") and message
- Toggle ON/OFF to show/hide without deleting

### Publishing
- **Publish** — Makes current drafts live
- **Discard** — Reverts to last published state
- **Preview** — See draft before publishing
- **History** — View/restore previous versions

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Express (serves API + Vite dev middleware)
- **Database**: SQLite via Prisma ORM
- **Styling**: Inline style objects (teal/dark theme)

## Project Structure

```
server/
  index.ts          # Express server entry point
  db.ts             # Prisma client
  sse.ts            # Server-sent events for real-time updates
  routes/           # REST API endpoints
src/
  pages/
    Dashboard.tsx   # Lobby display (auto-scroll, real-time)
    Admin.tsx       # Content management UI
  components/       # Header, ServiceTable, EventCard, AdvisoryTicker
  constants/        # Shared constants (colors, defaults, presets)
  utils/            # API client, markdown parser
prisma/
  schema.prisma     # Data models
  seed.ts           # Default data for --reset
```

## Development

```bash
npm install
npm run dev
```

### Database Changes

Edit `prisma/schema.prisma`, then:

```bash
npx prisma db push
```

### Adding New Features

1. Add model to `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Create route in `server/routes/`
4. Register in `server/index.ts`
5. Add types to `src/types.ts`
6. Build UI components

## Configuration

Scroll speeds and ticker speeds are configurable in the Admin UI:
- Higher numbers = slower scrolling
- Set to 0 to stop scrolling

Default values are defined in `src/constants/config.ts`.
