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
import { sseHandler } from './sse.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const app = express();

app.use(express.json());

// Prevent browser caching of API responses
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

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

// Global error handler - MUST be after all routes
app.use(errorHandler);

export default app;
