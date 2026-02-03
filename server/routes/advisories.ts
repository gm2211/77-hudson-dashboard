import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';

const router = Router();

router.get('/', async (_req, res) => {
  const advisories = await prisma.advisory.findMany();
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
  await prisma.advisory.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
  broadcast();
});

export default router;
