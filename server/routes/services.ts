/**
 * Services API Routes - CRUD operations for building services.
 *
 * Uses createCrudRoutes factory for standard operations.
 * Services represent building systems (HVAC, elevators, etc.) with status tracking.
 *
 * ROUTES:
 * - GET /api/services - List all services
 * - POST /api/services - Create new service
 * - PUT /api/services/:id - Update service
 * - DELETE /api/services/:id - Mark for deletion
 * - POST /api/services/:id/unmark - Undo mark for deletion
 *
 * RELATED FILES:
 * - server/utils/createCrudRoutes.ts - Factory that generates these routes
 * - src/types.ts - Service type definition
 */
import { createCrudRoutes } from '../utils/createCrudRoutes.js';
import type { Service } from '@prisma/client';

export default createCrudRoutes<Service>({
  model: 'service',
  orderBy: { sortOrder: 'asc' },
});
