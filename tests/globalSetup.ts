import { execSync } from 'child_process';

const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/hudson_dashboard_test';

export function setup() {
  // Create the test database (ignore error if it already exists)
  try {
    execSync(
      `psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "DROP DATABASE IF EXISTS hudson_dashboard_test;" -c "CREATE DATABASE hudson_dashboard_test;"`,
      { stdio: 'pipe' },
    );
  } catch {
    // If psql isn't available, try via docker
    execSync(
      `docker exec $(docker compose ps -q postgres) psql -U postgres -c "DROP DATABASE IF EXISTS hudson_dashboard_test;" -c "CREATE DATABASE hudson_dashboard_test;"`,
      { stdio: 'pipe' },
    );
  }

  // Push schema to test database
  execSync('npx prisma db push --skip-generate', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });
}

export function teardown() {
  try {
    execSync(
      `psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "DROP DATABASE IF EXISTS hudson_dashboard_test;"`,
      { stdio: 'pipe' },
    );
  } catch {
    try {
      execSync(
        `docker exec $(docker compose ps -q postgres) psql -U postgres -c "DROP DATABASE IF EXISTS hudson_dashboard_test;"`,
        { stdio: 'pipe' },
      );
    } catch {
      // Best effort cleanup
    }
  }
}
