import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { testPrisma } from '../setup.js';

/** Helper: seed some test data into the DB */
async function seedTestData() {
  await testPrisma.service.createMany({
    data: [
      { name: 'HVAC', status: 'Operational', sortOrder: 0 },
      { name: 'Elevators', status: 'Maintenance', sortOrder: 1 },
    ],
  });

  await testPrisma.event.createMany({
    data: [
      {
        title: 'Yoga Class',
        subtitle: 'Weekly yoga',
        details: JSON.stringify(['Tuesday 7 AM', 'Studio']),
        imageUrl: '/images/yoga.jpg',
        accentColor: '#e91e63',
        sortOrder: 0,
      },
      {
        title: 'Brunch',
        subtitle: 'Community brunch',
        details: JSON.stringify(['Saturday 10 AM']),
        imageUrl: '/images/brunch.jpg',
        accentColor: '#00bcd4',
        sortOrder: 1,
      },
    ],
  });

  await testPrisma.advisory.create({
    data: { label: 'NOTICE', message: 'Water shutoff tonight', active: true },
  });

  await testPrisma.buildingConfig.create({
    data: { buildingNumber: '77', buildingName: 'Hudson', subtitle: 'Monitor' },
  });
}

describe('Snapshots API', () => {
  describe('Publish workflow', () => {
    it('POST /api/snapshots publishes current state as a snapshot', async () => {
      await seedTestData();

      const res = await request(app).post('/api/snapshots');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.version).toBe(1);
      expect(res.body.state.services).toHaveLength(2);
      expect(res.body.state.events).toHaveLength(2);
      expect(res.body.state.advisories).toHaveLength(1);
      expect(res.body.state.config).toBeDefined();
      expect(res.body.state.config.buildingNumber).toBe('77');
    });

    it('publishing hard-deletes items marked for deletion', async () => {
      await seedTestData();
      // Mark one event for deletion
      const events = await testPrisma.event.findMany();
      await testPrisma.event.update({
        where: { id: events[0].id },
        data: { markedForDeletion: true },
      });

      const res = await request(app).post('/api/snapshots');
      expect(res.body.state.events).toHaveLength(1);
      expect(res.body.state.events[0].title).toBe('Brunch');

      // Verify hard-deleted from DB
      const remaining = await testPrisma.event.findMany();
      expect(remaining).toHaveLength(1);
    });

    it('publish increments version number', async () => {
      await seedTestData();

      const res1 = await request(app).post('/api/snapshots');
      expect(res1.body.version).toBe(1);

      const res2 = await request(app).post('/api/snapshots');
      expect(res2.body.version).toBe(2);
    });
  });

  describe('GET /api/snapshots/latest', () => {
    it('returns current state when no snapshots exist', async () => {
      await seedTestData();

      const res = await request(app).get('/api/snapshots/latest');
      expect(res.status).toBe(200);
      expect(res.body.services).toHaveLength(2);
      expect(res.body.events).toHaveLength(2);
    });

    it('returns published snapshot data in flat format', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots'); // publish

      const res = await request(app).get('/api/snapshots/latest');
      expect(res.status).toBe(200);
      // Should have flat format (not nested section format)
      expect(Array.isArray(res.body.services)).toBe(true);
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(Array.isArray(res.body.advisories)).toBe(true);
      expect(res.body.config).toBeDefined();
      expect(res.body.config.buildingNumber).toBe('77');
      expect(res.body.config.scrollSpeed).toBeDefined();
      expect(res.body.config.tickerSpeed).toBeDefined();
      expect(res.body.config.servicesScrollSpeed).toBeDefined();
    });

    it('returns updated data after delete + publish (the original bug)', async () => {
      await seedTestData();

      // First publish
      await request(app).post('/api/snapshots');
      const latestBefore = await request(app).get('/api/snapshots/latest');
      expect(latestBefore.body.events).toHaveLength(2);

      // Mark one event for deletion and publish
      const events = await testPrisma.event.findMany();
      await testPrisma.event.update({
        where: { id: events[0].id },
        data: { markedForDeletion: true },
      });
      await request(app).post('/api/snapshots');

      // Latest should reflect the deletion
      const latestAfter = await request(app).get('/api/snapshots/latest');
      expect(latestAfter.body.events).toHaveLength(1);
    });
  });

  describe('Legacy snapshot format backward compatibility', () => {
    it('handles old flat-format snapshots gracefully', async () => {
      // Simulate an old-format snapshot (flat arrays, not nested sections)
      const legacyData = {
        services: [{ id: 1, name: 'HVAC', status: 'Operational', sortOrder: 0 }],
        events: [{ id: 1, title: 'Yoga', subtitle: 'Sub', details: ['d1'], sortOrder: 0 }],
        advisories: [{ id: 1, label: 'NOTICE', message: 'Test', active: true }],
        config: { buildingNumber: '77', buildingName: 'Hudson', subtitle: 'Monitor' },
      };

      await testPrisma.publishedSnapshot.create({
        data: { version: 1, data: JSON.stringify(legacyData) },
      });

      const res = await request(app).get('/api/snapshots/latest');
      expect(res.status).toBe(200);
      // Should return the data without crashing
      expect(res.body.services).toHaveLength(1);
      expect(res.body.events).toHaveLength(1);
      expect(res.body.advisories).toHaveLength(1);
      expect(res.body.config.buildingNumber).toBe('77');
    });
  });

  describe('GET /api/snapshots/:version', () => {
    it('returns a specific snapshot version', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');

      const res = await request(app).get('/api/snapshots/1');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe(1);
      expect(res.body.services).toBeDefined();
    });

    it('returns 404 for non-existent version', async () => {
      const res = await request(app).get('/api/snapshots/999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/snapshots', () => {
    it('lists all snapshots', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');
      await request(app).post('/api/snapshots');

      const res = await request(app).get('/api/snapshots');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      // Should be ordered desc
      expect(res.body[0].version).toBe(2);
      expect(res.body[1].version).toBe(1);
    });
  });

  describe('Draft status', () => {
    it('GET /api/snapshots/draft-status shows changes when no published snapshot', async () => {
      await seedTestData();

      const res = await request(app).get('/api/snapshots/draft-status');
      expect(res.status).toBe(200);
      expect(res.body.hasChanges).toBe(true);
    });

    it('GET /api/snapshots/draft-status shows no changes after publish', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');

      const res = await request(app).get('/api/snapshots/draft-status');
      expect(res.status).toBe(200);
      expect(res.body.hasChanges).toBe(false);
    });

    it('GET /api/snapshots/draft-status detects new changes after publish', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');

      // Make a change
      await testPrisma.service.create({
        data: { name: 'New Service', status: 'Operational', sortOrder: 99 },
      });

      const res = await request(app).get('/api/snapshots/draft-status');
      expect(res.body.hasChanges).toBe(true);
      expect(res.body.sectionChanges.services).toBe(true);
    });

    it('detects marked-for-deletion as a change', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');

      const services = await testPrisma.service.findMany();
      await testPrisma.service.update({
        where: { id: services[0].id },
        data: { markedForDeletion: true },
      });

      const res = await request(app).get('/api/snapshots/draft-status');
      expect(res.body.hasChanges).toBe(true);
      expect(res.body.sectionChanges.services).toBe(true);
    });
  });

  describe('Discard', () => {
    it('POST /api/snapshots/discard restores to last published state', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');

      // Delete a service (not just mark)
      const services = await testPrisma.service.findMany();
      await testPrisma.service.delete({ where: { id: services[0].id } });

      // Add a new one
      await testPrisma.service.create({
        data: { name: 'New Service', status: 'Operational', sortOrder: 99 },
      });

      // Discard
      const res = await request(app).post('/api/snapshots/discard');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Should be back to original 2 services
      const serviceList = await testPrisma.service.findMany();
      expect(serviceList).toHaveLength(2);
    });
  });

  describe('DELETE /api/snapshots/:version', () => {
    it('deletes a specific snapshot version', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');
      await request(app).post('/api/snapshots');

      const res = await request(app).delete('/api/snapshots/1');
      expect(res.status).toBe(200);

      const list = await request(app).get('/api/snapshots');
      expect(list.body).toHaveLength(1);
      expect(list.body[0].version).toBe(2);
    });

    it('cannot delete the only remaining snapshot', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');

      const res = await request(app).delete('/api/snapshots/1');
      expect(res.status).toBe(400);
    });
  });

  describe('Purge', () => {
    it('DELETE /api/snapshots purges all but latest', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots');
      await request(app).post('/api/snapshots');
      await request(app).post('/api/snapshots');

      const res = await request(app).delete('/api/snapshots');
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(2);

      const list = await request(app).get('/api/snapshots');
      expect(list.body).toHaveLength(1);
      expect(list.body[0].version).toBe(3);
    });
  });

  describe('Restore', () => {
    it('POST /api/snapshots/restore/:version restores to a version', async () => {
      await seedTestData();
      await request(app).post('/api/snapshots'); // v1: 2 services

      // Add a service and publish again
      await testPrisma.service.create({
        data: { name: 'New', status: 'Operational', sortOrder: 99 },
      });
      await request(app).post('/api/snapshots'); // v2: 3 services

      // Restore to v1
      const res = await request(app).post('/api/snapshots/restore/1');
      expect(res.status).toBe(200);
      expect(res.body.newVersion).toBe(3);

      // Should now have 2 services again
      const services = await testPrisma.service.findMany();
      expect(services).toHaveLength(2);
    });
  });
});
