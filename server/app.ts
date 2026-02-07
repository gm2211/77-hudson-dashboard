import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer, { MulterError } from 'multer';
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    }
  },
});

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

app.post('/api/upload', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(500).json({ error: 'Upload failed' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/images/uploads/${req.file.filename}` });
  });
});

// Global error handler - MUST be after all routes
app.use(errorHandler);

export default app;
