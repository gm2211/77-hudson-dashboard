import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';

const router = Router();

async function getCurrentState() {
  const [services, events, advisories, config] = await Promise.all([
    prisma.service.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }),
    prisma.event.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }),
    prisma.advisory.findMany({ where: { deletedAt: null } }),
    prisma.buildingConfig.findFirst(),
  ]);
  return {
    services,
    events: events.map(e => ({ ...e, details: JSON.parse(e.details) })),
    advisories,
    config,
  };
}

router.get('/published', async (_req, res) => {
  const snapshot = await prisma.publishedSnapshot.findFirst({ orderBy: { publishedAt: 'desc' } });
  if (!snapshot) {
    return res.json(await getCurrentState());
  }
  res.json(JSON.parse(snapshot.data));
});

router.post('/publish', async (_req, res) => {
  const state = await getCurrentState();
  await prisma.publishedSnapshot.deleteMany();
  await prisma.publishedSnapshot.create({ data: { data: JSON.stringify(state) } });
  broadcast();
  res.json({ ok: true });
});

router.post('/discard', async (_req, res) => {
  const snapshot = await prisma.publishedSnapshot.findFirst({ orderBy: { publishedAt: 'desc' } });
  if (!snapshot) return res.json({ ok: true, message: 'No snapshot to restore' });

  const data = JSON.parse(snapshot.data);

  await prisma.$transaction(async (tx) => {
    await tx.service.deleteMany();
    await tx.event.deleteMany();
    await tx.advisory.deleteMany();

    if (data.services?.length) {
      await tx.service.createMany({
        data: data.services.map((s: any) => ({
          id: s.id, name: s.name, status: s.status, sortOrder: s.sortOrder, lastChecked: new Date(s.lastChecked),
        })),
      });
    }
    if (data.events?.length) {
      await tx.event.createMany({
        data: data.events.map((e: any) => ({
          id: e.id, title: e.title, subtitle: e.subtitle,
          details: JSON.stringify(e.details), imageUrl: e.imageUrl,
          accentColor: e.accentColor, sortOrder: e.sortOrder,
        })),
      });
    }
    if (data.advisories?.length) {
      await tx.advisory.createMany({
        data: data.advisories.map((a: any) => ({
          id: a.id, label: a.label, message: a.message, active: a.active,
        })),
      });
    }
    if (data.config) {
      const existing = await tx.buildingConfig.findFirst();
      if (existing) {
        await tx.buildingConfig.update({
          where: { id: existing.id },
          data: {
            buildingNumber: data.config.buildingNumber,
            buildingName: data.config.buildingName,
            subtitle: data.config.subtitle,
            scrollSpeed: data.config.scrollSpeed,
          },
        });
      }
    }
  });

  res.json({ ok: true });
});

router.get('/draft-status', async (_req, res) => {
  const snapshot = await prisma.publishedSnapshot.findFirst({ orderBy: { publishedAt: 'desc' } });
  if (!snapshot) return res.json({ hasChanges: true });

  const current = await getCurrentState();
  const published = JSON.parse(snapshot.data);

  const hasChanges = JSON.stringify(current) !== JSON.stringify(published);
  res.json({ hasChanges });
});

export default router;
