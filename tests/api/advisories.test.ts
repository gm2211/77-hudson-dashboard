import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { testPrisma } from '../setup.js';

describe('Advisories API', () => {
  it('GET /api/advisories returns empty array', async () => {
    const res = await request(app).get('/api/advisories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/advisories creates an advisory', async () => {
    const res = await request(app)
      .post('/api/advisories')
      .send({ label: 'NOTICE', message: 'Water shutoff tonight', active: true });

    expect(res.status).toBe(200);
    expect(res.body.label).toBe('NOTICE');
    expect(res.body.message).toBe('Water shutoff tonight');
    expect(res.body.active).toBe(true);
  });

  it('PUT /api/advisories/:id updates an advisory', async () => {
    const advisory = await testPrisma.advisory.create({
      data: { label: 'NOTICE', message: 'Old message', active: true },
    });

    const res = await request(app)
      .put(`/api/advisories/${advisory.id}`)
      .send({ message: 'Updated message', active: false });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Updated message');
    expect(res.body.active).toBe(false);
  });

  it('DELETE /api/advisories/:id marks for deletion', async () => {
    const advisory = await testPrisma.advisory.create({
      data: { label: 'NOTICE', message: 'Test', active: true },
    });

    await request(app).delete(`/api/advisories/${advisory.id}`);

    const dbAdvisory = await testPrisma.advisory.findUnique({ where: { id: advisory.id } });
    expect(dbAdvisory!.markedForDeletion).toBe(true);
  });

  it('POST /api/advisories/:id/unmark removes deletion mark', async () => {
    const advisory = await testPrisma.advisory.create({
      data: { label: 'NOTICE', message: 'Test', active: true, markedForDeletion: true },
    });

    const res = await request(app).post(`/api/advisories/${advisory.id}/unmark`);
    expect(res.status).toBe(200);

    const dbAdvisory = await testPrisma.advisory.findUnique({ where: { id: advisory.id } });
    expect(dbAdvisory!.markedForDeletion).toBe(false);
  });
});
