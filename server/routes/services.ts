import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';
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
  broadcast();
});

router.put('/:id', async (req, res) => {
  const service = await prisma.service.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(service);
  broadcast();
});

router.delete('/:id', async (req, res) => {
  await prisma.service.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
  broadcast();
});

export default router;
