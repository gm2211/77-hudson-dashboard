const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const api = {
  get: <T = any>(url: string): Promise<T> =>
    fetch(url).then(r => r.json()),

  post: <T = any>(url: string, body?: unknown): Promise<T> =>
    fetch(url, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: body ? JSON.stringify(body) : undefined
    }).then(r => r.json()),

  put: <T = any>(url: string, body: unknown): Promise<T> =>
    fetch(url, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(body)
    }).then(r => r.json()),

  del: <T = any>(url: string): Promise<T> =>
    fetch(url, { method: 'DELETE' }).then(r => r.json()),
};
