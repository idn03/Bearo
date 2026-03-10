# Bearo — Project Plan

## 1. Project Overview

### Purpose

Bearo is a full-stack task management application designed to practice core engineering concepts: authentication, authorization, CRUD operations, database design, security, and end-to-end testing.

### Key Engineering Concepts

- **Client-server communication** — Next.js frontend consuming a NestJS REST API
- **Authentication & authorization** — JWT-based auth with route protection on both sides
- **CRUD API design** — RESTful endpoints with DTO validation
- **User data isolation** — Row-level scoping via `userId` foreign key, enforced at the service layer
- **Security** — bcrypt hashing, JWT validation, rate limiting, CORS, input validation
- **Testing** — Backend E2E with Supertest, frontend E2E with Playwright
- **CI/CD** — GitHub Actions pipeline for lint, test, build

---

## 2. System Architecture

### Client-Server Architecture

```
┌──────────────────┐        HTTP/JSON         ┌──────────────────┐        SQL         ┌────────────┐
│                  │   ◄─────────────────►     │                  │   ◄──────────────►  │            │
│  Next.js (App    │                           │  NestJS API      │                     │ PostgreSQL │
│  Router + SSR)   │                           │  (REST + JWT)    │                     │            │
│  Shadcn + TW     │                           │  Prisma ORM      │                     │            │
│                  │                           │                  │                     │            │
└──────────────────┘                           └──────────────────┘                     └────────────┘
     Port 3000                                      Port 3001
```

Next.js handles routing, SSR/CSR, and UI. The NestJS API is a separate process handling all business logic and data access. Communication is JSON over HTTP.

### Authentication Flow (JWT)

```
Client                           NestJS API                       Database
  │                                  │                                │
  │── POST /api/auth/register ──────►│                                │
  │   { username, password }         │── hash password (bcrypt) ─────►│
  │                                  │── INSERT user ────────────────►│
  │◄── { accessToken } ─────────────│                                │
  │                                  │                                │
  │── POST /api/auth/login ─────────►│                                │
  │   { username, password }         │── SELECT user by username ────►│
  │                                  │── bcrypt.compare()             │
  │                                  │── sign JWT { sub: userId }     │
  │◄── { accessToken } ─────────────│                                │
  │                                  │                                │
  │── GET /api/todos ────────────────►│                                │
  │   Authorization: Bearer <token>  │── verify JWT (guard) ──────────│
  │                                  │── extract userId from token    │
  │                                  │── SELECT todos WHERE userId ──►│
  │◄── [ todos ] ────────────────────│                                │
  │                                  │                                │
  │── Logout (client-side) ──────────│                                │
  │   remove token from storage      │                                │
```

### API Communication Strategy

The Next.js frontend uses a centralized API client (Axios instance) with:
- A **request interceptor** that attaches `Authorization: Bearer <token>` to every request
- A **response interceptor** that catches 401 errors and redirects to `/login`
- Base URL configured via environment variable (`NEXT_PUBLIC_API_URL`)

### API Endpoints

```
POST   /api/auth/register      — create account
POST   /api/auth/login         — authenticate, return JWT
GET    /api/auth/profile       — get current user info (protected)

GET    /api/todos              — list user's todos (supports pagination)
POST   /api/todos              — create a todo
GET    /api/todos/:id          — get a single todo
PATCH  /api/todos/:id          — update todo (title, description, completed)
DELETE /api/todos/:id          — delete todo
```

---

## 3. Database Design

### ORM: Prisma

Prisma provides type-safe queries, auto-generated client, and clear schema definition. It integrates well with NestJS and simplifies migrations.

### Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  todos     Todo[]

  @@map("users")
}

model Todo {
  id          String   @id @default(uuid())
  title       String   @db.VarChar(255)
  description String?  @db.Text
  completed   Boolean  @default(false)
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("todos")
}
```

### Relationships & Constraints

- `users.username` — unique constraint, used for login
- `todos.user_id` — foreign key to `users.id`, cascading delete
- Index on `todos.user_id` for efficient filtering by user
- `User 1 ──── * Todo` — one user has many todos, each todo belongs to one user

---

## 4. Backend Architecture (NestJS)

### Module Structure

```
AppModule
  ├── AuthModule        — register, login, JWT strategy, guards
  ├── UsersModule       — user entity, user service
  ├── TodosModule       — CRUD operations, scoped to user
  └── PrismaModule      — database connection (global)
```

### Controllers

**AuthController:**
- `POST /auth/register` — validate DTO, hash password, create user, return token
- `POST /auth/login` — validate credentials, return token
- `GET /auth/profile` — return current user info (protected)

**TodosController:**
- All routes protected by `JwtAuthGuard`
- User ID extracted from JWT via `@Request() req` — `req.user.sub`
- Passes `userId` to the service layer for every operation

### Services

**AuthService:**
- `register(dto)` — check username uniqueness, hash password, create user, sign JWT
- `login(dto)` — find user by username, compare password, sign JWT
- `validateUser(username, password)` — used by strategy

**TodosService:**
- `findAll(userId, page, limit)` — paginated query, filtered by userId
- `findOne(id, userId)` — find by id AND userId (rejects access to other users' todos)
- `create(dto, userId)` — create with userId attached
- `update(id, dto, userId)` — find by id + userId, then update
- `remove(id, userId)` — find by id + userId, then delete

### JWT Guard & Strategy

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; username: string }) {
    return { sub: payload.sub, username: payload.username };
  }
}

// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### DTO Validation

```typescript
// create-todo.dto.ts
export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// register.dto.ts
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### Rate Limiting

Rate limiting applied to auth endpoints only (10 requests per minute per IP) via `@nestjs/throttler`.

---

## 5. Frontend Architecture (Next.js)

### App Router Structure

```
/                       → redirect to /dashboard (if authenticated) or /login
/login                  → login page
/register               → registration page
/dashboard              → todo list (protected)
```

### Route Protection

Next.js middleware checks for a valid token cookie. Unauthenticated users are redirected to `/login`. Authenticated users on `/login` or `/register` are redirected to `/dashboard`.

### Authentication State Management

React Context (`AuthContext`) with `useAuth()` hook providing:
- `user`, `token`, `isLoading`
- `login()`, `register()`, `logout()`

Token stored in localStorage. The `AuthProvider` wraps the app layout.

### API Client

Centralized Axios instance at `src/lib/api.ts` with:
- Request interceptor: attaches Bearer token
- Response interceptor: redirects to `/login` on 401

### UI Component Organization

Built on Shadcn UI + Tailwind CSS:
- `components/ui/` — Shadcn primitives (Button, Input, Card, Dialog, etc.)
- `components/todo-item.tsx` — single todo with edit/delete/toggle
- `components/todo-list.tsx` — list with pagination controls
- `components/todo-form.tsx` — create/edit form
- `components/layout/` — header, theme toggle
- `components/layout-toggle.tsx` — compact/card view switch

### Additional UI Features

- **Dark/Light mode** — `next-themes` with Tailwind `darkMode: "class"`
- **Adjustable layout** — toggle between compact list and card view, stored in localStorage
- **Pagination** — query params `?page=1&limit=10` passed to the API

---

## 6. Project Folder Structure

```
bearo/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── login.dto.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   └── strategies/
│   │   │       └── jwt.strategy.ts
│   │   ├── todos/
│   │   │   ├── todos.controller.ts
│   │   │   ├── todos.service.ts
│   │   │   ├── todos.module.ts
│   │   │   └── dto/
│   │   │       ├── create-todo.dto.ts
│   │   │       └── update-todo.dto.ts
│   │   ├── users/
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   ├── prisma/
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── test/
│   │   ├── auth.e2e-spec.ts
│   │   ├── todos.e2e-spec.ts
│   │   └── jest-e2e.json
│   ├── .env.example
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                       # Shadcn UI components
│   │   │   ├── layout/
│   │   │   │   ├── header.tsx
│   │   │   │   └── theme-toggle.tsx
│   │   │   ├── todo-item.tsx
│   │   │   ├── todo-list.tsx
│   │   │   ├── todo-form.tsx
│   │   │   └── layout-toggle.tsx
│   │   ├── context/
│   │   │   └── auth-context.tsx
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   └── use-todos.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   └── todos.spec.ts
│   ├── middleware.ts
│   ├── playwright.config.ts
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml
├── PLAN.md
├── CLAUDE.md
└── .gitignore
```

---

## 7. Development Workflows

### Git Branching Strategy

```
main ──────────────────────────────────────────────►
  │                                        ▲
  └── develop ─────────────────────────────►│
        │              ▲         ▲          │
        ├── feature/auth ──┘     │          │
        └── feature/todos ───────┘          │
```

- `main` — production-ready, deployable code
- `develop` — integration branch for ongoing work
- `feature/*` — one branch per feature, branched from `develop`
- `fix/*` — bug fix branches

### Feature Development Workflow

1. Create branch: `git checkout -b feature/<name> develop`
2. Implement with incremental commits
3. Push and open PR against `develop`
4. CI must pass before review
5. Squash merge after approval

### Pull Request Process

- PR title: concise description of the change
- PR body: what changed, why, how to test
- At least one approval required
- All CI checks must pass
- Squash merge to keep history clean

### Code Review Checklist

- Tests cover the new/changed code
- No hardcoded secrets
- DTOs validate all inputs
- Todos scoped to authenticated user (service layer)
- No `any` types in TypeScript
- Consistent with existing patterns

---

## 8. Testing Strategy

### 8.1 Backend E2E Tests (NestJS + Supertest)

Run against a real test database. Each test suite sets up its own users/data.

**Auth test scenarios:**

```
✓ POST /auth/register — creates user, returns accessToken
✓ POST /auth/register — rejects duplicate username
✓ POST /auth/register — rejects weak password (< 8 chars)
✓ POST /auth/login — returns accessToken for valid credentials
✓ POST /auth/login — returns 401 for wrong password
✓ POST /auth/login — returns 401 for non-existent user
✓ GET /auth/profile — returns user info with valid token
✓ GET /auth/profile — returns 401 without token
```

**Todo test scenarios:**

```
✓ POST /todos — creates todo for authenticated user
✓ GET /todos — returns only the current user's todos
✓ GET /todos — supports pagination (page, limit)
✓ GET /todos/:id — returns 404 for another user's todo
✓ PATCH /todos/:id — updates own todo
✓ PATCH /todos/:id — toggles completion status
✓ PATCH /todos/:id — returns 404 for another user's todo
✓ DELETE /todos/:id — deletes own todo
✓ DELETE /todos/:id — returns 404 for another user's todo
✓ POST /todos — rejects empty title
```

### 8.2 Frontend E2E Tests (Playwright)

Test full user journeys through the browser against a running backend.

**Scenarios:**

```
Auth flows:
  ✓ User can register and is redirected to /dashboard
  ✓ User can log in with valid credentials
  ✓ User sees error for invalid credentials
  ✓ Unauthenticated user is redirected to /login

Todo flows:
  ✓ User can create a new todo
  ✓ User can see their list of todos
  ✓ User can mark a todo as completed
  ✓ User can edit a todo's title
  ✓ User can delete a todo

UI features:
  ✓ User can toggle dark/light mode
  ✓ User can switch between compact and card layout
  ✓ Pagination works correctly

Data isolation:
  ✓ User A cannot see User B's todos
```

---

## 9. CI/CD Pipeline (GitHub Actions)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: bearo
          POSTGRES_PASSWORD: bearo
          POSTGRES_DB: bearo_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: backend/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: npx prettier --check "src/**/*.ts"
      - run: npx tsc --noEmit
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://bearo:bearo@localhost:5432/bearo_test
      - run: pnpm run test
        env:
          DATABASE_URL: postgresql://bearo:bearo@localhost:5432/bearo_test
          JWT_SECRET: ci-test-secret
      - run: pnpm run test:e2e
        env:
          DATABASE_URL: postgresql://bearo:bearo@localhost:5432/bearo_test
          JWT_SECRET: ci-test-secret
      - run: pnpm run build

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: npx tsc --noEmit
      - run: pnpm run build

  frontend-e2e:
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: bearo
          POSTGRES_PASSWORD: bearo
          POSTGRES_DB: bearo_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: pnpm install --frozen-lockfile
        working-directory: backend
      - run: npx prisma migrate deploy
        working-directory: backend
        env:
          DATABASE_URL: postgresql://bearo:bearo@localhost:5432/bearo_test
      - run: pnpm run start &
        working-directory: backend
        env:
          DATABASE_URL: postgresql://bearo:bearo@localhost:5432/bearo_test
          JWT_SECRET: ci-test-secret

      - run: pnpm install --frozen-lockfile
        working-directory: frontend
      - run: npx playwright install --with-deps
        working-directory: frontend
      - run: pnpm run test:e2e
        working-directory: frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001/api
```

---

## 10. Development Roadmap

### Phase 1 — Project Setup ✅
- Initialize monorepo structure (`backend/`, `frontend/`)
- Set up NestJS with Prisma, ConfigModule, ValidationPipe
- Set up Next.js with App Router, Tailwind CSS, Shadcn UI
- Create `docker-compose.yml` for PostgreSQL
- Configure ESLint, Prettier, TypeScript strict mode
- Create Prisma schema with User and Todo models

### Phase 2 — Authentication ✅
- Implement `UsersModule` and `UsersService`
- Implement `AuthModule`: register, login, JWT strategy, guard
- Add rate limiting to auth endpoints
- Build frontend login and register dialogs (Shadcn forms)
- Set up the light/dark mode toggle (UI only)
- Implement `AuthContext`, `useAuth` hook, Next.js middleware
- Wire up Axios interceptors

### Phase 3 — Todo CRUD ✅
- Implement `TodosModule`: controller, service, DTOs
- Enforce user scoping in service layer
- Add pagination support (`page`, `limit` query params)
- Build dashboard page: todo list, create form, inline edit, delete
- Implement toggle completion

### Phase 4 — UI Enhancements ✅
- Add animation when switch theme mode
- Implement layout toggle (compact list vs card view)
- Add a random sticker for each todo item
- Store UI preferences in localStorage
- Polish responsive design

### Phase 5 — Testing
- Write backend E2E tests for auth and todo flows
- Write Playwright E2E tests for frontend user journeys
- Test data isolation between users
- Add unit tests for critical logic (password hashing, JWT)

### Phase 6 — CI/CD ✅
- Set up GitHub Actions workflow (lint, typecheck, test, build)
- Configure PostgreSQL service container for CI
- Add Playwright E2E job
- (Optional) Add deployment step
