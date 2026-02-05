import { Router } from 'express';
import prisma from '../db.js';
import { broadcast } from '../sse.js';

const router = Router();

// Helper to get current draft state organized by section
// Each section contains its items + any config that affects it
async function getCurrentState() {
  const [services, events, advisories, config] = await Promise.all([
    prisma.service.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }),
    prisma.event.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } }),
    prisma.advisory.findMany({ where: { deletedAt: null } }),
    prisma.buildingConfig.findFirst(),
  ]);

  return {
    // Config section: building identity fields
    config: config ? {
      buildingNumber: config.buildingNumber,
      buildingName: config.buildingName,
      subtitle: config.subtitle,
    } : null,
    // Services section: service items + services scroll speed
    services: {
      items: services.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        notes: s.notes,
        lastChecked: s.lastChecked.toISOString(),
        sortOrder: s.sortOrder,
      })),
      scrollSpeed: config?.servicesScrollSpeed ?? 8,
    },
    // Events section: event items + events scroll speed
    events: {
      items: events.map(e => ({
        id: e.id,
        title: e.title,
        subtitle: e.subtitle,
        details: JSON.parse(e.details),
        imageUrl: e.imageUrl,
        accentColor: e.accentColor,
        sortOrder: e.sortOrder,
      })),
      scrollSpeed: config?.scrollSpeed ?? 30,
    },
    // Advisories section: advisory items + ticker speed
    advisories: {
      items: advisories.map(a => ({
        id: a.id,
        label: a.label,
        message: a.message,
        active: a.active,
      })),
      tickerSpeed: config?.tickerSpeed ?? 25,
    },
  };
}

// Helper to get next version number
async function getNextVersion(): Promise<number> {
  const latest = await prisma.publishedSnapshot.findFirst({ orderBy: { version: 'desc' } });
  return (latest?.version ?? 0) + 1;
}

// Transform internal section-based format to flat API format for frontend compatibility
function toApiFormat(state: any) {
  return {
    services: state.services.items,
    events: state.events.items,
    advisories: state.advisories.items,
    config: state.config ? {
      ...state.config,
      scrollSpeed: state.events.scrollSpeed,
      tickerSpeed: state.advisories.tickerSpeed,
      servicesScrollSpeed: state.services.scrollSpeed,
    } : null,
  };
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
    return res.json(toApiFormat(await getCurrentState()));
  }
  res.json(toApiFormat(JSON.parse(snapshot.data)));
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

  // Normalize a section for comparison (handles items with markedForDeletion and excludes operational fields)
  const normalizeSection = (section: any, excludeFields: string[] = []) => {
    if (!section) return null;
    const { items, ...config } = section;
    const normalizedItems = (items || [])
      .filter((item: any) => !item.markedForDeletion)
      .map((item: any) => {
        const normalized = { ...item };
        excludeFields.forEach(f => delete normalized[f]);
        return normalized;
      })
      .sort((a: any, b: any) => a.id - b.id); // Sort by id for consistent comparison
    return { items: normalizedItems, ...config };
  };

  // Check if any items are marked for deletion (these count as changes even if items match)
  const hasMarkedServices = current.services.items.some((s: any) => s.markedForDeletion);
  const hasMarkedEvents = current.events.items.some((e: any) => e.markedForDeletion);
  const hasMarkedAdvisories = current.advisories.items.some((a: any) => a.markedForDeletion);

  // Normalize and compare each section generically
  // Services: exclude lastChecked (operational data, not content)
  const currentServicesNorm = normalizeSection(current.services, ['lastChecked']);
  const publishedServicesNorm = normalizeSection(published.services, ['lastChecked']);

  const currentEventsNorm = normalizeSection(current.events);
  const publishedEventsNorm = normalizeSection(published.events);

  const currentAdvisoriesNorm = normalizeSection(current.advisories);
  const publishedAdvisoriesNorm = normalizeSection(published.advisories);

  const sectionChanges = {
    config: JSON.stringify(current.config) !== JSON.stringify(published.config),
    services: hasMarkedServices || JSON.stringify(currentServicesNorm) !== JSON.stringify(publishedServicesNorm),
    events: hasMarkedEvents || JSON.stringify(currentEventsNorm) !== JSON.stringify(publishedEventsNorm),
    advisories: hasMarkedAdvisories || JSON.stringify(currentAdvisoriesNorm) !== JSON.stringify(publishedAdvisoriesNorm),
  };

  const hasChanges = Object.values(sectionChanges).some(Boolean);
  res.json({ hasChanges, sectionChanges, published: toApiFormat(published) });
});

// GET /api/snapshots/:version - Get specific snapshot data
router.get('/:version(\\d+)', async (req, res) => {
  const version = Number(req.params.version);
  const snapshot = await prisma.publishedSnapshot.findUnique({ where: { version } });
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }
  res.json({ ...toApiFormat(JSON.parse(snapshot.data)), version: snapshot.version, publishedAt: snapshot.publishedAt });
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

// Helper function to compute diff between two snapshots (using new section-based format)
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

  // Services diff (items are in .items now)
  const fromServicesMap = new Map((from.services?.items || []).map((s: any) => [s.id, s]));
  const toServicesMap = new Map((to.services?.items || []).filter((s: any) => !s.markedForDeletion).map((s: any) => [s.id, s]));

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

  // Events diff (items are in .items now)
  const fromEventsMap = new Map((from.events?.items || []).map((e: any) => [e.id, e]));
  const toEventsMap = new Map((to.events?.items || []).filter((e: any) => !e.markedForDeletion).map((e: any) => [e.id, e]));

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

  // Advisories diff (items are in .items now)
  const fromAdvisoriesMap = new Map((from.advisories?.items || []).map((a: any) => [a.id, a]));
  const toAdvisoriesMap = new Map((to.advisories?.items || []).filter((a: any) => !a.markedForDeletion).map((a: any) => [a.id, a]));

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

  // Config diff - compare building config fields
  const fromConfig = from.config || {};
  const toConfig = to.config || {};
  for (const key of Object.keys({ ...fromConfig, ...toConfig })) {
    const fromVal = fromConfig[key] ?? '';
    const toVal = toConfig[key] ?? '';
    if (String(fromVal) !== String(toVal)) {
      diff.config.changed.push({ field: key, from: fromVal, to: toVal });
    }
  }

  // Also include scroll speed changes in the diff
  if ((from.services?.scrollSpeed ?? 8) !== (to.services?.scrollSpeed ?? 8)) {
    diff.config.changed.push({ field: 'Services Page Speed', from: from.services?.scrollSpeed ?? 8, to: to.services?.scrollSpeed ?? 8 });
  }
  if ((from.events?.scrollSpeed ?? 30) !== (to.events?.scrollSpeed ?? 30)) {
    diff.config.changed.push({ field: 'Events Scroll Speed', from: from.events?.scrollSpeed ?? 30, to: to.events?.scrollSpeed ?? 30 });
  }
  if ((from.advisories?.tickerSpeed ?? 25) !== (to.advisories?.tickerSpeed ?? 25)) {
    diff.config.changed.push({ field: 'Ticker Speed', from: from.advisories?.tickerSpeed ?? 25, to: to.advisories?.tickerSpeed ?? 25 });
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
  // Return the published state in API format so client can use it directly
  res.json({ ok: true, version, state: toApiFormat(state) });
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

    // Restore from snapshot (using new section-based format)
    if (data.services?.items?.length) {
      await tx.service.createMany({
        data: data.services.items.map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          notes: s.notes || '',
          sortOrder: s.sortOrder,
          lastChecked: new Date(s.lastChecked),
        })),
      });
    }
    if (data.events?.items?.length) {
      await tx.event.createMany({
        data: data.events.items.map((e: any) => ({
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
    if (data.advisories?.items?.length) {
      await tx.advisory.createMany({
        data: data.advisories.items.map((a: any) => ({
          id: a.id,
          label: a.label,
          message: a.message,
          active: a.active,
        })),
      });
    }
    // Restore config from building config + section scroll speeds
    const existing = await tx.buildingConfig.findFirst();
    if (existing) {
      await tx.buildingConfig.update({
        where: { id: existing.id },
        data: {
          buildingNumber: data.config?.buildingNumber ?? existing.buildingNumber,
          buildingName: data.config?.buildingName ?? existing.buildingName,
          subtitle: data.config?.subtitle ?? existing.subtitle,
          scrollSpeed: data.events?.scrollSpeed ?? 30,
          tickerSpeed: data.advisories?.tickerSpeed ?? 25,
          servicesScrollSpeed: data.services?.scrollSpeed ?? 8,
        },
      });
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

    // Restore from snapshot (using new section-based format)
    if (data.services?.items?.length) {
      await tx.service.createMany({
        data: data.services.items.map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          notes: s.notes || '',
          sortOrder: s.sortOrder,
          lastChecked: new Date(s.lastChecked),
        })),
      });
    }
    if (data.events?.items?.length) {
      await tx.event.createMany({
        data: data.events.items.map((e: any) => ({
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
    if (data.advisories?.items?.length) {
      await tx.advisory.createMany({
        data: data.advisories.items.map((a: any) => ({
          id: a.id,
          label: a.label,
          message: a.message,
          active: a.active,
        })),
      });
    }
    // Restore config from building config + section scroll speeds
    const existing = await tx.buildingConfig.findFirst();
    if (existing) {
      await tx.buildingConfig.update({
        where: { id: existing.id },
        data: {
          buildingNumber: data.config?.buildingNumber ?? existing.buildingNumber,
          buildingName: data.config?.buildingName ?? existing.buildingName,
          subtitle: data.config?.subtitle ?? existing.subtitle,
          scrollSpeed: data.events?.scrollSpeed ?? 30,
          tickerSpeed: data.advisories?.tickerSpeed ?? 25,
          servicesScrollSpeed: data.services?.scrollSpeed ?? 8,
        },
      });
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
    // Restore selected services (items are in .items now)
    if (items.services?.length) {
      for (const id of items.services) {
        const service = data.services?.items?.find((s: any) => s.id === id);
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

    // Restore selected events (items are in .items now)
    if (items.events?.length) {
      for (const id of items.events) {
        const event = data.events?.items?.find((e: any) => e.id === id);
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

    // Restore selected advisories (items are in .items now)
    if (items.advisories?.length) {
      for (const id of items.advisories) {
        const advisory = data.advisories?.items?.find((a: any) => a.id === id);
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
