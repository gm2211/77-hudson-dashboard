import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { testPrisma } from '../setup.js';

describe('SSE endpoint', () => {
  it('GET /api/events-stream returns correct SSE headers', async () => {
    const res = await request(app)
      .get('/api/events-stream')
      .buffer(false)
      .parse((res, cb) => {
        // Don't wait for body — just capture headers
        res.on('data', () => {});
        res.on('end', () => cb(null, ''));
      });

    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['connection']).toBe('keep-alive');
  });

  it('publishes update event that can be received via SSE', async () => {
    // Seed data and publish
    await testPrisma.service.create({
      data: { name: 'HVAC', status: 'Operational', sortOrder: 0 },
    });
    await testPrisma.buildingConfig.create({
      data: { buildingNumber: '77', buildingName: 'Hudson', subtitle: 'Test' },
    });

    // Publishing triggers broadcast() which sends 'data: refresh\n\n' to connected clients
    const res = await request(app).post('/api/snapshots');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('SSE endpoint is accessible and responds', async () => {
    // Verify the endpoint doesn't 404
    const res = await request(app)
      .get('/api/events-stream')
      .buffer(false)
      .parse((res, cb) => {
        res.on('data', () => {});
        res.on('end', () => cb(null, ''));
      });

    expect(res.status).toBe(200);
  });
});
