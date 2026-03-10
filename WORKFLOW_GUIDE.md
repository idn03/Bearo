# CI/CD Workflow Guide

## Overview

Bearo uses GitHub Actions for continuous integration. The pipeline validates code quality, runs tests, and verifies builds on every push and pull request to `main` and `develop` branches.

## Workflow File

`.github/workflows/ci.yml`

## Jobs

The pipeline consists of three jobs:

### 1. `backend` — Backend Lint, Test & Build

Runs against a PostgreSQL 16 service container.

| Step | What it does |
|------|-------------|
| Install dependencies | `pnpm install --frozen-lockfile` |
| Lint | ESLint on all backend TypeScript files |
| Format check | Prettier check (no auto-fix, fails if unformatted) |
| Type check | `tsc --noEmit` for compile-time type safety |
| Prisma migrations | `prisma migrate deploy` against the test database |
| Unit tests | `pnpm run test` (Jest) |
| E2E tests | `pnpm run test:e2e` (Jest + Supertest) |
| Build | `nest build` to verify production compilation |

**Environment variables provided:**
- `DATABASE_URL` — points to the CI PostgreSQL service
- `JWT_SECRET` — test-only secret (`ci-test-secret`)
- `JWT_EXPIRATION` — `15m`

### 2. `frontend` — Frontend Lint, Typecheck & Build

No database needed. Validates frontend code quality.

| Step | What it does |
|------|-------------|
| Install dependencies | `pnpm install --frozen-lockfile` |
| Lint | ESLint on frontend code |
| Type check | `tsc --noEmit` |
| Build | `next build` to verify production build |

### 3. `frontend-e2e` — Playwright E2E Tests

Runs **after** both `backend` and `frontend` jobs pass. Spins up the full stack:

| Step | What it does |
|------|-------------|
| Start backend | Installs deps, runs migrations, starts NestJS in background |
| Wait for backend | Polls `http://localhost:3001/api` until ready (up to 30s) |
| Install Playwright | Installs browsers and OS dependencies |
| Run E2E tests | `pnpm run test:e2e` in the frontend directory |
| Upload report | Saves Playwright HTML report as a build artifact (14-day retention) |

## When It Runs

| Trigger | Branches |
|---------|----------|
| `push` | `main`, `develop` |
| `pull_request` | `main`, `develop` |

## Job Dependencies

```
backend ──────┐
              ├──► frontend-e2e
frontend ─────┘
```

`backend` and `frontend` run in parallel. `frontend-e2e` only runs if both pass.

## How Developers Use It

### Day-to-day workflow

1. Create a feature branch from `develop`
2. Push commits — CI runs automatically on PR
3. Fix any failures before requesting review
4. All three jobs must pass before merging

### Viewing results

- **GitHub Actions tab** — see job status, logs, and timing
- **PR checks** — each job appears as a separate check on the pull request
- **Playwright report** — download from the build artifacts if E2E tests fail

### Running checks locally

Before pushing, you can run the same checks locally:

```bash
# Backend
cd backend
pnpm run lint
npx prettier --check "src/**/*.ts"
npx tsc --noEmit
pnpm run test
pnpm run test:e2e
pnpm run build

# Frontend
cd frontend
pnpm run lint
npx tsc --noEmit
pnpm run build
```

## CI Database

The workflow uses a PostgreSQL 16 service container with:
- User: `bearo`
- Password: `bearo`
- Database: `bearo_test`

This is separate from local development (`bearo_dev`) to avoid data conflicts.
