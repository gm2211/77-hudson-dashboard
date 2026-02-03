import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';
import { addSoftDeleteRoutes } from './softDelete.js';

const router = Router();

const parseEventDetails = (e: any) => ({ ...e, details: JSON.parse(e.details) });

addSoftDeleteRoutes(router, prisma.event, parseEventDetails);

router.get('/', async (_req, res) => {
  const events = await prisma.event.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } });
  res.json(events.map(parseEventDetails));
});

router.post('/', async (req, res) => {
  const { details, ...rest } = req.body;
  const event = await prisma.event.create({
    data: { ...rest, details: JSON.stringify(details || []) },
  });
  res.json(parseEventDetails(event));
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
  res.json(parseEventDetails(event));
  broadcast();
});

router.delete('/:id', async (req, res) => {
  await prisma.event.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
  broadcast();
});

export default router;
