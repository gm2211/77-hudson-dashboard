import type { Request, Response } from 'express';

const clients = new Set<Response>();

export function sseHandler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

export function broadcast() {
  for (const client of clients) {
    client.write('data: refresh\n\n');
  }
}
