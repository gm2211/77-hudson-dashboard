import { execSync } from 'child_process';

const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/hudson_dashboard_test';

export function setup() {
  // Create the test database
  const createDbCmd = `psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "DROP DATABASE IF EXISTS hudson_dashboard_test;" -c "CREATE DATABASE hudson_dashboard_test;"`;
  const dockerCmd = `docker exec $(docker compose ps -q postgres) psql -U postgres -c "DROP DATABASE IF EXISTS hudson_dashboard_test;" -c "CREATE DATABASE hudson_dashboard_test;"`;

  try {
    execSync(createDbCmd, { stdio: 'pipe' });
  } catch {
    try {
      execSync(dockerCmd, { stdio: 'pipe' });
    } catch {
      console.warn(
        'Could not create test database. Make sure PostgreSQL is running locally or via docker compose.\n' +
        'Skipping DB creation — tests will fail if the database does not exist.'
      );
      return;
    }
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
