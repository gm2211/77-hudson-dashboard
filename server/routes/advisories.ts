import { Router } from 'express';
import prisma from '../db.js';
import { addSoftDeleteRoutes } from './softDelete.js';

const router = Router();

addSoftDeleteRoutes(router, prisma.advisory);

router.get('/', async (_req, res) => {
  const advisories = await prisma.advisory.findMany({ where: { deletedAt: null } });
  res.json(advisories);
});

router.post('/', async (req, res) => {
  const advisory = await prisma.advisory.create({ data: req.body });
  res.json(advisory);
});

router.put('/:id', async (req, res) => {
  const advisory = await prisma.advisory.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(advisory);
});

// Mark for deletion (draft) - will be actually deleted on publish
router.delete('/:id', async (req, res) => {
  await prisma.advisory.update({ where: { id: Number(req.params.id) }, data: { markedForDeletion: true } });
  res.json({ ok: true });
});

// Unmark for deletion (undo in draft)
router.post('/:id/unmark', async (req, res) => {
  await prisma.advisory.update({ where: { id: Number(req.params.id) }, data: { markedForDeletion: false } });
  res.json({ ok: true });
});

export default router;
