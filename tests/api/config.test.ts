import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { testPrisma } from '../setup.js';

describe('Config API', () => {
  it('GET /api/config creates default config if none exists', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.buildingNumber).toBe('77');
    expect(res.body.buildingName).toBe('Hudson Dashboard');
  });

  it('GET /api/config returns existing config', async () => {
    await testPrisma.buildingConfig.create({
      data: { buildingNumber: '99', buildingName: 'Custom', subtitle: 'Sub' },
    });

    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.buildingNumber).toBe('99');
    expect(res.body.buildingName).toBe('Custom');
  });

  it('PUT /api/config updates existing config', async () => {
    await testPrisma.buildingConfig.create({
      data: { buildingNumber: '77', buildingName: 'Hudson', subtitle: 'Monitor' },
    });

    const res = await request(app)
      .put('/api/config')
      .send({ buildingName: 'Updated Name', scrollSpeed: 20 });

    expect(res.status).toBe(200);
    expect(res.body.buildingName).toBe('Updated Name');
    expect(res.body.scrollSpeed).toBe(20);
  });

  it('PUT /api/config creates config if none exists', async () => {
    const res = await request(app)
      .put('/api/config')
      .send({ buildingNumber: '42', buildingName: 'New Building' });

    expect(res.status).toBe(200);
    expect(res.body.buildingNumber).toBe('42');
  });
});
