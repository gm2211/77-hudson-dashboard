import { Router } from 'express';
import prisma from '../db.js';
import { addSoftDeleteRoutes } from './softDelete.js';

const router = Router();

addSoftDeleteRoutes(router, prisma.service);

router.get('/', async (_req, res) => {
  const services = await prisma.service.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } });
  res.json(services);
});

router.post('/', async (req, res) => {
  const service = await prisma.service.create({ data: req.body });
  res.json(service);
});

router.put('/:id', async (req, res) => {
  const service = await prisma.service.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(service);
});

// Mark for deletion (draft) - will be actually deleted on publish
router.delete('/:id', async (req, res) => {
  await prisma.service.update({ where: { id: Number(req.params.id) }, data: { markedForDeletion: true } });
  res.json({ ok: true });
});

// Unmark for deletion (undo in draft)
router.post('/:id/unmark', async (req, res) => {
  await prisma.service.update({ where: { id: Number(req.params.id) }, data: { markedForDeletion: false } });
  res.json({ ok: true });
});

export default router;
