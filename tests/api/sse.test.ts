import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';

describe('SSE /api/events-stream', () => {
  it('returns correct SSE headers', async () => {
    const res = await request(app)
      .get('/api/events-stream')
      .buffer(false)
      .parse((res, callback) => {
        // Read just enough to get headers, then abort
        res.on('data', () => {
          res.destroy();
        });
        // Give it a moment to receive keepalive then close
        setTimeout(() => {
          res.destroy();
          callback(null, '');
        }, 100);
      });

    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['connection']).toBe('keep-alive');
  });
});
