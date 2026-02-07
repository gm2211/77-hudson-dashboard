import type { Request, Response } from 'express';

const MAX_CLIENTS = 100;
const KEEPALIVE_INTERVAL_MS = 30_000;

const clients = new Set<Response>();

export function sseHandler(req: Request, res: Response) {
  if (clients.size >= MAX_CLIENTS) {
    res.status(503).json({ error: 'Too many SSE connections' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.add(res);

  // Send keepalive comments to prevent proxy timeouts
  const keepalive = setInterval(() => {
    try {
      res.write(':\n\n');
    } catch {
      cleanup();
    }
  }, KEEPALIVE_INTERVAL_MS);

  function cleanup() {
    clearInterval(keepalive);
    clients.delete(res);
  }

  req.on('close', cleanup);
}

export function broadcast() {
  for (const client of clients) {
    try {
      client.write('data: refresh\n\n');
    } catch {
      clients.delete(client);
    }
  }
}
