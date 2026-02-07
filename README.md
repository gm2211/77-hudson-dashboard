# 77 Hudson Dashboard

A digital signage dashboard for residential building lobbies. Displays real-time service status, upcoming events, and scrolling advisories on lobby screens.

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gm2211/77-hudson-dashboard)

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

```bash
# Edit prisma/schema.prisma, then:
npx prisma db push
```

## License

[MIT](LICENSE)
