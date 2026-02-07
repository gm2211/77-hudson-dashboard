import { beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/hudson_dashboard_test';

// Set DATABASE_URL before any other module reads it
process.env.DATABASE_URL = TEST_DB_URL;

// Single shared Prisma client for all tests
export const testPrisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

beforeEach(async () => {
  // Clean all tables before each test
  await testPrisma.publishedSnapshot.deleteMany();
  await testPrisma.service.deleteMany();
  await testPrisma.event.deleteMany();
  await testPrisma.advisory.deleteMany();
  await testPrisma.buildingConfig.deleteMany();
});
