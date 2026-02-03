import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';

const router = Router();

// Helper to get current draft state
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

// Helper to get next version number
async function getNextVersion(): Promise<number> {
  const latest = await prisma.publishedSnapshot.findFirst({ orderBy: { version: 'desc' } });
  return (latest?.version ?? 0) + 1;
}

// GET /api/snapshots - List all snapshots (version, publishedAt)
router.get('/', async (_req, res) => {
  const snapshots = await prisma.publishedSnapshot.findMany({
    orderBy: { version: 'desc' },
    select: { id: true, version: true, publishedAt: true },
  });
  res.json(snapshots);
});

// GET /api/snapshots/latest - Get latest published snapshot (replaces /api/published)
router.get('/latest', async (_req, res) => {
  const snapshot = await prisma.publishedSnapshot.findFirst({ orderBy: { version: 'desc' } });
  if (!snapshot) {
    return res.json(await getCurrentState());
  }
  res.json(JSON.parse(snapshot.data));
});

// GET /api/snapshots/draft-status - Get draft vs latest diff (replaces /api/draft-status)
router.get('/draft-status', async (_req, res) => {
  const snapshot = await prisma.publishedSnapshot.findFirst({ orderBy: { version: 'desc' } });
  if (!snapshot) {
    return res.json({
      hasChanges: true,
      sectionChanges: { config: true, services: true, events: true, advisories: true },
      published: null,
    });
  }

  const current = await getCurrentState();
  const published = JSON.parse(snapshot.data);

  // Compare only the editable fields for config
  const configFields = (() => {
    if (!current.config && !published.config) return { buildingChanged: false, scrollSpeedChanged: false, tickerSpeedChanged: false };
    if (!current.config || !published.config) return { buildingChanged: true, scrollSpeedChanged: true, tickerSpeedChanged: true };
    return {
      buildingChanged: (
        String(current.config.buildingNumber || '') !== String(published.config.buildingNumber || '') ||
        String(current.config.buildingName || '') !== String(published.config.buildingName || '') ||
        String(current.config.subtitle || '') !== String(published.config.subtitle || '')
      ),
      scrollSpeedChanged: Number(current.config.scrollSpeed) !== Number(published.config.scrollSpeed),
      tickerSpeedChanged: Number(current.config.tickerSpeed) !== Number(published.config.tickerSpeed),
    };
  })();

  // Check for items marked for deletion
  const hasMarkedServices = current.services.some((s: any) => s.markedForDeletion);
  const hasMarkedEvents = current.events.some((e: any) => e.markedForDeletion);
  const hasMarkedAdvisories = current.advisories.some((a: any) => a.markedForDeletion);

  // Normalize services comparison
  const normalizeService = (s: any) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    notes: s.notes || '',
    lastChecked: s.lastChecked,
    sortOrder: s.sortOrder,
  });
  const currentServicesNormalized = current.services.filter((s: any) => !s.markedForDeletion).map(normalizeService);
  const publishedServicesNormalized = (published.services || []).map(normalizeService);

  // Filter out marked items before comparing
  const currentEventsFiltered = current.events.filter((e: any) => !e.markedForDeletion);
  const currentAdvisoriesFiltered = current.advisories.filter((a: any) => !a.markedForDeletion);

  const eventsChanged = JSON.stringify(currentEventsFiltered) !== JSON.stringify(published.events);
  const advisoriesChanged = JSON.stringify(currentAdvisoriesFiltered) !== JSON.stringify(published.advisories);

  const sectionChanges = {
    config: configFields.buildingChanged,
    services: hasMarkedServices || JSON.stringify(currentServicesNormalized) !== JSON.stringify(publishedServicesNormalized),
    events: hasMarkedEvents || eventsChanged || configFields.scrollSpeedChanged,
    advisories: hasMarkedAdvisories || advisoriesChanged || configFields.tickerSpeedChanged,
  };

  const hasChanges = Object.values(sectionChanges).some(Boolean);
  res.json({ hasChanges, sectionChanges, published });
});

// GET /api/snapshots/:version - Get specific snapshot data
router.get('/:version(\\d+)', async (req, res) => {
  const version = Number(req.params.version);
  const snapshot = await prisma.publishedSnapshot.findUnique({ where: { version } });
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }
  res.json({ ...JSON.parse(snapshot.data), version: snapshot.version, publishedAt: snapshot.publishedAt });
});

// GET /api/snapshots/:v1/diff/:v2 - Get diff between two snapshots
router.get('/:v1(\\d+)/diff/:v2', async (req, res) => {
  const v1 = Number(req.params.v1);
  const v2 = req.params.v2;

  const snapshot1 = await prisma.publishedSnapshot.findUnique({ where: { version: v1 } });
  if (!snapshot1) {
    return res.status(404).json({ error: `Snapshot v${v1} not found` });
  }

  let data2: any;
  if (v2 === 'draft') {
    // Compare to current draft state
    data2 = await getCurrentState();
  } else {
    const snapshot2 = await prisma.publishedSnapshot.findUnique({ where: { version: Number(v2) } });
    if (!snapshot2) {
      return res.status(404).json({ error: `Snapshot v${v2} not found` });
    }
    data2 = JSON.parse(snapshot2.data);
  }

  const data1 = JSON.parse(snapshot1.data);

  // Compute diff for each section
  const diff = computeDiff(data1, data2);
  res.json(diff);
});

// Helper function to compute diff between two snapshots
function computeDiff(from: any, to: any) {
  const diff: {
    services: { added: any[]; removed: any[]; changed: any[] };
    events: { added: any[]; removed: any[]; changed: any[] };
    advisories: { added: any[]; removed: any[]; changed: any[] };
    config: { changed: { field: string; from: any; to: any }[] };
  } = {
    services: { added: [], removed: [], changed: [] },
    events: { added: [], removed: [], changed: [] },
    advisories: { added: [], removed: [], changed: [] },
    config: { changed: [] },
  };

  // Services diff
  const fromServicesMap = new Map((from.services || []).map((s: any) => [s.id, s]));
  const toServicesMap = new Map((to.services || []).filter((s: any) => !s.markedForDeletion).map((s: any) => [s.id, s]));

  for (const [id, service] of toServicesMap) {
    if (!fromServicesMap.has(id)) {
      diff.services.added.push(service);
    } else {
      const fromService = fromServicesMap.get(id);
      if (hasChanges(fromService, service, ['name', 'status', 'notes'])) {
        diff.services.changed.push({ from: fromService, to: service });
      }
    }
  }
  for (const [id, service] of fromServicesMap) {
    if (!toServicesMap.has(id)) {
      diff.services.removed.push(service);
    }
  }

  // Events diff
  const fromEventsMap = new Map((from.events || []).map((e: any) => [e.id, e]));
  const toEventsMap = new Map((to.events || []).filter((e: any) => !e.markedForDeletion).map((e: any) => [e.id, e]));

  for (const [id, event] of toEventsMap) {
    if (!fromEventsMap.has(id)) {
      diff.events.added.push(event);
    } else {
      const fromEvent = fromEventsMap.get(id);
      if (hasChanges(fromEvent, event, ['title', 'subtitle', 'imageUrl']) ||
          JSON.stringify(fromEvent.details) !== JSON.stringify(event.details)) {
        diff.events.changed.push({ from: fromEvent, to: event });
      }
    }
  }
  for (const [id, event] of fromEventsMap) {
    if (!toEventsMap.has(id)) {
      diff.events.removed.push(event);
    }
  }

  // Advisories diff
  const fromAdvisoriesMap = new Map((from.advisories || []).map((a: any) => [a.id, a]));
  const toAdvisoriesMap = new Map((to.advisories || []).filter((a: any) => !a.markedForDeletion).map((a: any) => [a.id, a]));

  for (const [id, advisory] of toAdvisoriesMap) {
    if (!fromAdvisoriesMap.has(id)) {
      diff.advisories.added.push(advisory);
    } else {
      const fromAdvisory = fromAdvisoriesMap.get(id);
      if (hasChanges(fromAdvisory, advisory, ['label', 'message', 'active'])) {
        diff.advisories.changed.push({ from: fromAdvisory, to: advisory });
      }
    }
  }
  for (const [id, advisory] of fromAdvisoriesMap) {
    if (!toAdvisoriesMap.has(id)) {
      diff.advisories.removed.push(advisory);
    }
  }

  // Config diff
  const fromConfig = from.config || {};
  const toConfig = to.config || {};
  const configFields = [
    { key: 'buildingNumber', label: 'Building Number' },
    { key: 'buildingName', label: 'Building Name' },
    { key: 'subtitle', label: 'Subtitle' },
    { key: 'scrollSpeed', label: 'Scroll Speed' },
    { key: 'tickerSpeed', label: 'Ticker Speed' },
  ];
  for (const { key, label } of configFields) {
    const fromVal = fromConfig[key] ?? '';
    const toVal = toConfig[key] ?? '';
    if (String(fromVal) !== String(toVal)) {
      diff.config.changed.push({ field: label, from: fromVal, to: toVal });
    }
  }

  return diff;
}

function hasChanges(from: any, to: any, fields: string[]): boolean {
  return fields.some(f => String(from[f] ?? '') !== String(to[f] ?? ''));
}

// POST /api/snapshots - Publish = create new snapshot (replaces /api/publish)
router.post('/', async (_req, res) => {
  // Hard-delete items marked for deletion (no trash bin)
  await prisma.$transaction([
    prisma.service.deleteMany({ where: { markedForDeletion: true } }),
    prisma.event.deleteMany({ where: { markedForDeletion: true } }),
    prisma.advisory.deleteMany({ where: { markedForDeletion: true } }),
  ]);

  const state = await getCurrentState();
  const version = await getNextVersion();

  // Keep all snapshots, create new one with incremented version
  await prisma.publishedSnapshot.create({
    data: { version, data: JSON.stringify(state) },
  });

  broadcast();
  res.json({ ok: true, version });
});

// POST /api/snapshots/discard - Discard draft changes (replaces /api/discard)
router.post('/discard', async (_req, res) => {
  const snapshot = await prisma.publishedSnapshot.findFirst({ orderBy: { version: 'desc' } });
  if (!snapshot) return res.json({ ok: true, message: 'No snapshot to restore' });

  const data = JSON.parse(snapshot.data);

  await prisma.$transaction(async (tx) => {
    // Delete all current items (including soft-deleted)
    await tx.service.deleteMany();
    await tx.event.deleteMany();
    await tx.advisory.deleteMany();

    // Restore from snapshot
    if (data.services?.length) {
      await tx.service.createMany({
        data: data.services.map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          notes: s.notes || '',
          sortOrder: s.sortOrder,
          lastChecked: new Date(s.lastChecked),
        })),
      });
    }
    if (data.events?.length) {
      await tx.event.createMany({
        data: data.events.map((e: any) => ({
          id: e.id,
          title: e.title,
          subtitle: e.subtitle,
          details: JSON.stringify(e.details),
          imageUrl: e.imageUrl,
          accentColor: e.accentColor,
          sortOrder: e.sortOrder,
        })),
      });
    }
    if (data.advisories?.length) {
      await tx.advisory.createMany({
        data: data.advisories.map((a: any) => ({
          id: a.id,
          label: a.label,
          message: a.message,
          active: a.active,
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
            tickerSpeed: data.config.tickerSpeed,
          },
        });
      }
    }
  });

  res.json({ ok: true });
});

// POST /api/snapshots/restore/:version - Full restore to specific version (creates new version like git revert)
router.post('/restore/:version', async (req, res) => {
  const version = Number(req.params.version);
  const snapshot = await prisma.publishedSnapshot.findUnique({ where: { version } });
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  const data = JSON.parse(snapshot.data);

  await prisma.$transaction(async (tx) => {
    // Delete all current items
    await tx.service.deleteMany();
    await tx.event.deleteMany();
    await tx.advisory.deleteMany();

    // Restore from snapshot
    if (data.services?.length) {
      await tx.service.createMany({
        data: data.services.map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          notes: s.notes || '',
          sortOrder: s.sortOrder,
          lastChecked: new Date(s.lastChecked),
        })),
      });
    }
    if (data.events?.length) {
      await tx.event.createMany({
        data: data.events.map((e: any) => ({
          id: e.id,
          title: e.title,
          subtitle: e.subtitle,
          details: JSON.stringify(e.details),
          imageUrl: e.imageUrl,
          accentColor: e.accentColor,
          sortOrder: e.sortOrder,
        })),
      });
    }
    if (data.advisories?.length) {
      await tx.advisory.createMany({
        data: data.advisories.map((a: any) => ({
          id: a.id,
          label: a.label,
          message: a.message,
          active: a.active,
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
            tickerSpeed: data.config.tickerSpeed,
          },
        });
      }
    }
  });

  // Create a new snapshot with the restored state (like git revert creates a new commit)
  const newVersion = await getNextVersion();
  const restoredState = await getCurrentState();
  await prisma.publishedSnapshot.create({
    data: { version: newVersion, data: JSON.stringify(restoredState) },
  });

  broadcast();
  res.json({ ok: true, message: `Restored to v${version} as new v${newVersion}`, newVersion });
});

// POST /api/snapshots/restore-items - Selective restore specific items
router.post('/restore-items', async (req, res) => {
  const { sourceVersion, items } = req.body as {
    sourceVersion: number;
    items: { services?: number[]; events?: number[]; advisories?: number[] };
  };

  const snapshot = await prisma.publishedSnapshot.findUnique({ where: { version: sourceVersion } });
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  const data = JSON.parse(snapshot.data);
  const restoredItems: { services: number[]; events: number[]; advisories: number[] } = {
    services: [],
    events: [],
    advisories: [],
  };

  await prisma.$transaction(async (tx) => {
    // Restore selected services
    if (items.services?.length) {
      for (const id of items.services) {
        const service = data.services?.find((s: any) => s.id === id);
        if (service) {
          // Delete existing if present
          await tx.service.deleteMany({ where: { id } });
          // Create from snapshot
          await tx.service.create({
            data: {
              id: service.id,
              name: service.name,
              status: service.status,
              notes: service.notes || '',
              sortOrder: service.sortOrder,
              lastChecked: new Date(service.lastChecked),
            },
          });
          restoredItems.services.push(id);
        }
      }
    }

    // Restore selected events
    if (items.events?.length) {
      for (const id of items.events) {
        const event = data.events?.find((e: any) => e.id === id);
        if (event) {
          await tx.event.deleteMany({ where: { id } });
          await tx.event.create({
            data: {
              id: event.id,
              title: event.title,
              subtitle: event.subtitle,
              details: JSON.stringify(event.details),
              imageUrl: event.imageUrl,
              accentColor: event.accentColor,
              sortOrder: event.sortOrder,
            },
          });
          restoredItems.events.push(id);
        }
      }
    }

    // Restore selected advisories
    if (items.advisories?.length) {
      for (const id of items.advisories) {
        const advisory = data.advisories?.find((a: any) => a.id === id);
        if (advisory) {
          await tx.advisory.deleteMany({ where: { id } });
          await tx.advisory.create({
            data: {
              id: advisory.id,
              label: advisory.label,
              message: advisory.message,
              active: advisory.active,
            },
          });
          restoredItems.advisories.push(id);
        }
      }
    }
  });

  res.json({ ok: true, restored: restoredItems });
});

// DELETE /api/snapshots/:version - Delete a specific snapshot
router.delete('/:version(\\d+)', async (req, res) => {
  const version = Number(req.params.version);

  // Check if this is the only snapshot
  const count = await prisma.publishedSnapshot.count();
  if (count === 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining snapshot' });
  }

  const snapshot = await prisma.publishedSnapshot.findUnique({ where: { version } });
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  await prisma.publishedSnapshot.delete({ where: { version } });
  res.json({ ok: true, message: `Deleted snapshot v${version}` });
});

// DELETE /api/snapshots - Purge all history except the latest snapshot
router.delete('/', async (_req, res) => {
  const latest = await prisma.publishedSnapshot.findFirst({ orderBy: { version: 'desc' } });
  if (!latest) {
    return res.json({ ok: true, message: 'No snapshots to purge', deleted: 0 });
  }

  const result = await prisma.publishedSnapshot.deleteMany({
    where: { version: { not: latest.version } },
  });

  res.json({ ok: true, message: `Purged ${result.count} old snapshots, kept v${latest.version}`, deleted: result.count });
});

export default router;
