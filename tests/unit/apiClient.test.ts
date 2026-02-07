import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../src/utils/api';

describe('api client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(status: number, body: unknown, ok?: boolean) {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: ok ?? (status >= 200 && status < 300),
      status,
      statusText: 'OK',
      json: () => Promise.resolve(body),
    });
  }

  it('GET sends a GET request and returns parsed JSON', async () => {
    mockFetch(200, [{ id: 1, name: 'HVAC' }]);
    const result = await api.get('/api/services');
    expect(result).toEqual([{ id: 1, name: 'HVAC' }]);
    expect(global.fetch).toHaveBeenCalledWith('/api/services');
  });

  it('POST sends JSON body with Content-Type header', async () => {
    mockFetch(200, { id: 1, name: 'New' });
    await api.post('/api/services', { name: 'New' });
    expect(global.fetch).toHaveBeenCalledWith('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    });
  });

  it('PUT sends JSON body with Content-Type header', async () => {
    mockFetch(200, { id: 1, status: 'Maintenance' });
    await api.put('/api/services/1', { status: 'Maintenance' });
    expect(global.fetch).toHaveBeenCalledWith('/api/services/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Maintenance' }),
    });
  });

  it('DELETE sends a DELETE request', async () => {
    mockFetch(200, { ok: true });
    await api.del('/api/services/1');
    expect(global.fetch).toHaveBeenCalledWith('/api/services/1', {
      method: 'DELETE',
    });
  });

  it('throws ApiError on non-2xx status with server error message', async () => {
    mockFetch(400, { error: 'Validation failed' }, false);
    await expect(api.get('/api/services')).rejects.toThrow(ApiError);
    try {
      await api.get('/api/services');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).message).toBe('Validation failed');
    }
  });

  it('throws ApiError with fallback message when body has no error field', async () => {
    mockFetch(404, { data: 'irrelevant' }, false);
    try {
      await api.get('/api/missing');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).toBe('HTTP 404');
    }
  });

  it('POST without body sends undefined body', async () => {
    mockFetch(200, { ok: true });
    await api.post('/api/snapshots');
    expect(global.fetch).toHaveBeenCalledWith('/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
    });
  });

  it('ApiError has correct name property', () => {
    const err = new ApiError(500, 'Server Error');
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(500);
    expect(err.message).toBe('Server Error');
  });
});
