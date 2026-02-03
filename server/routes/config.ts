import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';

const router = Router();

router.get('/', async (_req, res) => {
  let config = await prisma.buildingConfig.findFirst();
  if (!config) {
    config = await prisma.buildingConfig.create({ data: {} });
  }
  res.json(config);
});

router.put('/', async (req, res) => {
  let config = await prisma.buildingConfig.findFirst();
  if (!config) {
    config = await prisma.buildingConfig.create({ data: req.body });
  } else {
    config = await prisma.buildingConfig.update({
      where: { id: config.id },
      data: req.body,
    });
  }
  res.json(config);
  broadcast();
});

export default router;
