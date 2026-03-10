# Bearo — Testing Guide

## Overview

Bearo uses a layered testing strategy covering backend unit tests, backend E2E tests, and frontend E2E tests to ensure correctness across the full stack.

| Layer | Framework | Location | Command |
|-------|-----------|----------|---------|
| Backend unit tests | Jest | `backend/src/**/*.spec.ts` | `cd backend && pnpm test` |
| Backend E2E tests | Jest + Supertest | `backend/test/*.e2e-spec.ts` | `cd backend && pnpm test:e2e` |
| Frontend E2E tests | Playwright | `frontend/e2e/*.spec.ts` | `cd frontend && pnpm test:e2e` |

---

## Backend Unit Tests

### What they test

- **AuthService** (`src/auth/auth.service.spec.ts`) — 8 tests
  - Password hashing with bcrypt (salt rounds = 10)
  - JWT signing with correct payload (`sub`, `username`) and expiry
  - Duplicate username rejection (ConflictException)
  - Invalid credentials rejection (UnauthorizedException)
  - Profile returns id + username, never password

- **TodosService** (`src/todos/todos.service.spec.ts`) — 9 tests
  - Paginated query with correct skip/take calculation
  - User-scoped queries (every Prisma call includes `userId`)
  - NotFoundException when todo doesn't exist or belongs to another user
  - CRUD operations: create, update, delete with ownership verification

### How they work

Unit tests mock dependencies (PrismaService, UsersService, JwtService) using Jest mocks. This isolates the business logic from the database and external services.

### Running

```bash
cd backend
pnpm test              # run all unit tests
pnpm test:watch        # watch mode
pnpm test:cov          # with coverage report
```

---

## Backend E2E Tests

### What they test

- **Auth flow** (`test/auth.e2e-spec.ts`) — 11 tests
  - `POST /api/auth/register` — creates user, returns JWT token
  - `POST /api/auth/register` — rejects duplicate username (409)
  - `POST /api/auth/register` — rejects weak password < 8 chars (400)
  - `POST /api/auth/register` — rejects short username < 3 chars (400)
  - `POST /api/auth/register` — rejects missing fields (400)
  - `POST /api/auth/register` — rejects extra fields / forbidNonWhitelisted (400)
  - `POST /api/auth/login` — returns token for valid credentials
  - `POST /api/auth/login` — returns 401 for wrong password
  - `POST /api/auth/login` — returns 401 for non-existent user
  - `GET /api/auth/profile` — returns user info with valid token
  - `GET /api/auth/profile` — returns 401 without / with invalid token

- **Todo CRUD + data isolation** (`test/todos.e2e-spec.ts`) — 17 tests
  - `POST /api/todos` — creates todo for authenticated user
  - `POST /api/todos` — creates todo with description
  - `POST /api/todos` — rejects empty/missing title (400)
  - `POST /api/todos` — rejects unauthenticated request (401)
  - `GET /api/todos` — returns only the current user's todos (data isolation)
  - `GET /api/todos` — supports pagination (page, limit)
  - `GET /api/todos/:id` — returns single todo
  - `GET /api/todos/:id` — returns 404 for another user's todo
  - `GET /api/todos/:id` — returns 404 for non-existent todo
  - `PATCH /api/todos/:id` — updates title
  - `PATCH /api/todos/:id` — toggles completion status
  - `PATCH /api/todos/:id` — returns 404 for another user's todo
  - `DELETE /api/todos/:id` — returns 404 for another user's todo
  - `DELETE /api/todos/:id` — deletes todo and verifies it's gone

### How they work

E2E tests spin up a real NestJS application with the full module graph (AppModule) connected to a real PostgreSQL database. They use Supertest to make HTTP requests against the running app.

Each test suite creates uniquely-named test users (using timestamps) and cleans them up in `afterAll` via cascade delete.

### Prerequisites

- PostgreSQL running: `docker compose up -d`
- Database migrated: `cd backend && npx prisma migrate dev`
- Environment variables set (`.env` or env vars)

### Running

```bash
cd backend
pnpm test:e2e
```

---

## Frontend E2E Tests (Playwright)

### What they test

- **Auth flows** (`e2e/auth.spec.ts`)
  - User can register and is redirected to `/dashboard`
  - User can log out and log back in
  - User sees error for invalid credentials
  - Unauthenticated user visiting `/dashboard` is redirected to `/`
  - Registration shows validation error for short username

- **Todo flows** (`e2e/todos.spec.ts`)
  - User can create a new todo
  - User can create a todo with description
  - User can mark a todo as completed
  - User can edit a todo's title
  - User can delete a todo

- **Data isolation** (`e2e/todos.spec.ts`)
  - User A cannot see User B's todos

- **UI features** (`e2e/todos.spec.ts`)
  - User can toggle dark/light mode
  - User can switch between compact and card layout

### How they work

Playwright launches a real Chromium browser and interacts with the app as a real user would — clicking buttons, filling forms, and verifying visible text. The config automatically starts both the backend and frontend dev servers.

### Prerequisites

- PostgreSQL running: `docker compose up -d`
- Database migrated: `cd backend && npx prisma migrate dev`
- Playwright browsers installed: `cd frontend && npx playwright install --with-deps`

### Running

```bash
cd frontend
pnpm test:e2e              # run all tests (headless)
npx playwright test --ui   # interactive UI mode
npx playwright show-report # view HTML report after run
```

---

## CI Integration

Tests run automatically in GitHub Actions on push/PR to `main` and `develop`:

1. **Backend job**: lint → typecheck → migrate → unit tests → e2e tests → build
2. **Frontend job**: lint → typecheck → build
3. **Frontend E2E job** (after both pass): starts backend + frontend, runs Playwright

See `.github/workflows/ci.yml` for full configuration.

---

## Writing New Tests

### Backend unit test

Create `src/<module>/<service>.spec.ts`, mock dependencies, test service methods:

```typescript
import { Test } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyService, { provide: Dep, useValue: mockDep }],
    }).compile();
    service = module.get(MyService);
  });

  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Backend E2E test

Create `test/<feature>.e2e-spec.ts`, use AppModule + Supertest:

```typescript
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Feature (e2e)', () => {
  // ... setup app with GlobalPrefix + ValidationPipe
  // ... make HTTP requests with request(app.getHttpServer())
});
```

### Frontend E2E test

Create `e2e/<feature>.spec.ts`, use Playwright:

```typescript
import { test, expect } from '@playwright/test';

test('user can do something', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Click me' }).click();
  await expect(page.getByText('Success')).toBeVisible();
});
```
