import { Router } from 'express';

/**
 * Adds soft-delete routes (GET /trash, POST /:id/restore, DELETE /:id/purge)
 * to an existing router for a given Prisma model delegate.
 * Optional transform function applied to trash items before sending.
 */
export function addSoftDeleteRoutes(router: Router, model: any, transform?: (item: any) => any) {
  router.get('/trash', async (_req, res) => {
    const items = await model.findMany({ where: { deletedAt: { not: null } } });
    res.json(transform ? items.map(transform) : items);
  });

  router.post('/:id/restore', async (req: any, res: any) => {
    await model.update({ where: { id: Number(req.params.id) }, data: { deletedAt: null } });
    res.json({ ok: true });
  });

  router.delete('/:id/purge', async (req: any, res: any) => {
    await model.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  });
}
