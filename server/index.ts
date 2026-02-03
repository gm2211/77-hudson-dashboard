import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import servicesRouter from './routes/services.js';
import eventsRouter from './routes/events.js';
import advisoriesRouter from './routes/advisories.js';
import configRouter from './routes/config.js';
import prisma from './db.js';
import { sseHandler } from './sse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/events-stream', sseHandler);

// API routes
app.use('/api/services', servicesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/advisories', advisoriesRouter);
app.use('/api/config', configRouter);

async function seedIfEmpty() {
  const count = await prisma.service.count();
  if (count > 0) return;

  await prisma.service.createMany({
    data: [
      { name: 'HVAC System', status: 'Operational', sortOrder: 0 },
      { name: 'Elevator Bank A', status: 'Operational', sortOrder: 1 },
      { name: 'Elevator Bank B', status: 'Maintenance', sortOrder: 2 },
      { name: 'Hot Water', status: 'Operational', sortOrder: 3 },
      { name: 'Cold Water', status: 'Operational', sortOrder: 4 },
      { name: 'Fire Safety System', status: 'Operational', sortOrder: 5 },
      { name: 'Security Cameras', status: 'Operational', sortOrder: 6 },
      { name: 'Intercom System', status: 'Operational', sortOrder: 7 },
      { name: 'Parking Garage', status: 'Outage', sortOrder: 8 },
      { name: 'Gym Access', status: 'Operational', sortOrder: 9 },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        title: 'Rooftop Yoga',
        subtitle: 'Saturday Mornings',
        details: JSON.stringify(['Every Saturday 8-9 AM', 'Mats provided', 'All levels welcome', 'Weather permitting']),
        accentColor: '#e91e63',
        sortOrder: 0,
      },
      {
        title: 'Package Room Update',
        subtitle: 'New Hours Effective Monday',
        details: JSON.stringify(['Mon-Fri: 8 AM - 9 PM', 'Sat-Sun: 10 AM - 6 PM', 'Photo ID required for pickup']),
        accentColor: '#00bcd4',
        sortOrder: 1,
      },
      {
        title: 'Lobby Renovation',
        subtitle: 'Phase 2 Starting Soon',
        details: JSON.stringify(['East entrance closed Jan 15-Feb 28', 'Use west entrance during construction', 'New seating area coming!']),
        accentColor: '#ff9800',
        sortOrder: 2,
      },
    ],
  });

  await prisma.advisory.create({
    data: {
      label: 'RESIDENT ADVISORY',
      message: 'Water shut-off scheduled for floors 10-15 on Tuesday 10 PM - 4 AM for pipe maintenance. Please store water accordingly.',
      active: true,
    },
  });

  await prisma.buildingConfig.create({
    data: {
      buildingNumber: '77',
      buildingName: 'Hudson Dashboard',
      subtitle: 'Real-time System Monitor',
    },
  });
}

async function start() {
  await seedIfEmpty();

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
