import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';

const router = Router();

router.get('/', async (_req, res) => {
  const events = await prisma.event.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } });
  const parsed = events.map(e => ({ ...e, details: JSON.parse(e.details) }));
  res.json(parsed);
});

router.get('/trash', async (_req, res) => {
  const events = await prisma.event.findMany({ where: { deletedAt: { not: null } }, orderBy: { sortOrder: 'asc' } });
  const parsed = events.map(e => ({ ...e, details: JSON.parse(e.details) }));
  res.json(parsed);
});

router.post('/', async (req, res) => {
  const { details, ...rest } = req.body;
  const event = await prisma.event.create({
    data: { ...rest, details: JSON.stringify(details || []) },
  });
  res.json({ ...event, details: JSON.parse(event.details) });
  broadcast();
});

router.put('/:id', async (req, res) => {
  const { details, ...rest } = req.body;
  const data: any = { ...rest };
  if (details !== undefined) data.details = JSON.stringify(details);
  const event = await prisma.event.update({
    where: { id: Number(req.params.id) },
    data,
  });
  res.json({ ...event, details: JSON.parse(event.details) });
  broadcast();
});

router.delete('/:id', async (req, res) => {
  await prisma.event.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
  broadcast();
});

router.post('/:id/restore', async (req, res) => {
  await prisma.event.update({ where: { id: Number(req.params.id) }, data: { deletedAt: null } });
  res.json({ ok: true });
  broadcast();
});

router.delete('/:id/purge', async (req, res) => {
  await prisma.event.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
  broadcast();
});

export default router;
