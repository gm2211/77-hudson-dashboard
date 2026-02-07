# 77 Hudson Dashboard

A digital signage dashboard for residential building lobbies. Displays real-time service status, upcoming events, and scrolling advisories on lobby screens.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Features

- **Service Status Board** — Track building services (Operational/Maintenance/Outage)
- **Event Cards** — Announcements with images and markdown-formatted details
- **Advisory Ticker** — Scrolling yellow banner for important notices
- **Admin UI** — Draft/publish workflow with version history
- **Real-time Updates** — Server-sent events for instant refresh

## Deploy to Render

Click the button above. Render reads `render.yaml` and auto-provisions:
- A PostgreSQL database
- A web service running the app
- `DATABASE_URL` wired up automatically

No manual configuration needed. The app seeds itself with demo data on first start.

## Local Development

Requires Node.js 20+ and Docker.

```bash
# Start Postgres
docker compose up -d

# Install deps and set up database
npm install
npx prisma db push

# Run
npm run dev
```

- **Dashboard** (lobby display): http://localhost:3000
- **Admin panel**: http://localhost:3000/admin

To stop Postgres: `docker compose down` (data persists in the Docker volume).

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Express (serves API + Vite dev middleware)
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: Inline style objects (teal/dark theme)

## Project Structure

```
server/
  app.ts              # Express app (routes, middleware)
  index.ts            # Server entry point (seeding, startup)
  db.ts               # Prisma client
  sse.ts              # Server-sent events for real-time updates
  routes/             # REST API endpoints
  middleware/         # Error handling
  utils/              # CRUD route factory
src/
  pages/
    Dashboard.tsx     # Lobby display (auto-scroll, real-time)
    Admin.tsx         # Content management UI
  components/         # Header, ServiceTable, EventCard, AdvisoryTicker
  components/admin/   # Admin-specific components and section editors
  constants/          # Shared constants (colors, defaults, presets)
  utils/              # API client, markdown parser
prisma/
  schema.prisma       # Data models
tests/
  api/                # API + DB integration tests
```

## Development

### Running Tests

```bash
npm test              # Run tests (needs Postgres running)
npm run test:watch    # Run tests in watch mode
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
4. Register in `server/app.ts`
5. Add types to `src/types.ts`
6. Build UI components

## License

[MIT](LICENSE)
