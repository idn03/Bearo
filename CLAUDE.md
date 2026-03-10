# Bearo

A full-stack task management app for practicing authentication, CRUD, and testing.

## Project Structure

- `backend/` — NestJS API (port 3001)
- `frontend/` — Next.js App Router (port 3000)
- `PLAN.md` — Full project plan and architecture documentation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Shadcn UI, Tailwind CSS 4, Axios, next-themes |
| Backend | NestJS 11, TypeScript, Prisma 7, PostgreSQL 16 |
| Auth | @nestjs/passport, @nestjs/jwt, passport-jwt, bcrypt |
| Validation | class-validator, class-transformer |
| Testing | Jest + Supertest (backend), Playwright (frontend) |
| Package Manager | pnpm |
| Node | v22 |

## Key Architecture Decisions

- **Prisma 7**: Uses `prisma.config.ts` for database URL instead of `url` in schema datasource block. The DATABASE_URL is set in `.env`.
- **API prefix**: All backend routes are under `/api` (set in `main.ts` via `app.setGlobalPrefix('api')`)
- **CORS**: Backend allows requests from `CORS_ORIGIN` env var, defaults to `http://localhost:3000`
- **Validation**: Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`
- **User data isolation**: All todo queries MUST be scoped by `userId` in the service layer, never in controllers alone

## Database

- PostgreSQL via Docker: `docker compose up -d`
- Connection: `postgresql://bearo:bearo@localhost:5432/bearo_dev`
- Prisma schema: `backend/prisma/schema.prisma`
- Run migrations: `cd backend && npx prisma migrate dev`
- Two tables: `users` (id, username, password, timestamps) and `todos` (id, title, description, completed, user_id, timestamps)
- Relationship: User 1-to-many Todo, cascade delete

## Commands

### Backend (`cd backend`)
```
pnpm run start:dev     # dev server (port 3001)
pnpm run build         # compile
pnpm run lint          # eslint
pnpm run format        # prettier
pnpm run test          # unit tests
pnpm run test:e2e      # e2e tests
npx prisma migrate dev # run migrations
npx prisma generate    # regenerate client
npx prisma studio      # DB GUI
```

### Frontend (`cd frontend`)
```
pnpm run dev           # dev server (port 3000)
pnpm run build         # production build
pnpm run lint          # eslint
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://bearo:bearo@localhost:5432/bearo_dev
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=15m
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Development Roadmap Status

- [x] Phase 1 — Project Setup
- [x] Phase 2 — Authentication (backend auth module + frontend auth pages)
- [x] Phase 3 — Todo CRUD (backend endpoints + frontend dashboard)
- [ ] Phase 4 — UI Enhancements (dark mode, layout toggle, responsive)
- [ ] Phase 5 — Testing (backend e2e + Playwright)
- [x] Phase 6 — CI/CD (GitHub Actions)

## Conventions

- Backend modules follow NestJS convention: `module.ts`, `controller.ts`, `service.ts`, `dto/`, `guards/`, `strategies/`
- Frontend uses Next.js App Router with `src/` directory
- Shadcn UI components live in `src/components/ui/`
- API client is at `src/lib/api.ts` (Axios with JWT interceptor)
- Types are in `src/types/index.ts`
