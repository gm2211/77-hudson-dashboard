import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';
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
  broadcast();
});

router.put('/:id', async (req, res) => {
  const advisory = await prisma.advisory.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(advisory);
  broadcast();
});

router.delete('/:id', async (req, res) => {
  await prisma.advisory.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
  broadcast();
});

export default router;
