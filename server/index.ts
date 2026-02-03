import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

import servicesRouter from './routes/services.js';
import eventsRouter from './routes/events.js';
import advisoriesRouter from './routes/advisories.js';
import configRouter from './routes/config.js';
import snapshotsRouter from './routes/snapshots.js';
import prisma from './db.js';
import { sseHandler } from './sse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.resolve(__dirname, '../public/images/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({ storage });

app.use(express.json());

app.get('/api/events-stream', sseHandler);

// API routes
app.use('/api/services', servicesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/advisories', advisoriesRouter);
app.use('/api/config', configRouter);
app.use('/api/snapshots', snapshotsRouter);

app.post('/api/upload', upload.single('file'), (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/images/uploads/${req.file.filename}` });
});

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
        title: 'New Class! Kundalini Yoga',
        subtitle: 'Join us for transformative yoga sessions',
        details: JSON.stringify(['Every Tuesday & Thursday at 7:00 AM', 'Studio, 10th Floor', 'Free for all residents - No registration required']),
        imageUrl: '/images/yoga.jpg',
        accentColor: '#e91e63',
        sortOrder: 0,
      },
      {
        title: 'Community Bagel Brunch',
        subtitle: 'Connect with your neighbors over coffee and bagels',
        details: JSON.stringify(['Saturday, February 1st at 10:00 AM', 'Studio, 10th Floor', 'Free event - All residents welcome!', 'Resident must be in good standing.']),
        imageUrl: '/images/bagels.jpg',
        accentColor: '#00bcd4',
        sortOrder: 1,
      },
      {
        title: 'Tequila Tasting Night',
        subtitle: 'Discover premium tequilas and enjoy an evening of flavor',
        details: JSON.stringify(['Friday, March 14th at 7:00 PM', 'Studio, 10th Floor', 'Ages 21+ only - RSVP required by March 10th', 'Resident must be in good standing.']),
        imageUrl: '/images/tequila.jpg',
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

async function seedSnapshot() {
  const count = await prisma.publishedSnapshot.count();
  if (count > 0) return;

  const [services, events, advisories, config] = await Promise.all([
    prisma.service.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }),
    prisma.event.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }),
    prisma.advisory.findMany({ where: { deletedAt: null } }),
    prisma.buildingConfig.findFirst(),
  ]);
  const data = {
    services,
    events: events.map(e => ({ ...e, details: JSON.parse(e.details) })),
    advisories,
    config,
  };
  await prisma.publishedSnapshot.create({ data: { version: 1, data: JSON.stringify(data) } });
}

async function start() {
  await seedIfEmpty();
  await seedSnapshot();

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
