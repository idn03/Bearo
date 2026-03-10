# Bearo

A full-stack task management application built with Next.js and NestJS. Bearo covers authentication, CRUD operations, user data isolation, and end-to-end testing — all wired together with a clean, modern UI.

## Demo

<video src="demo.mov" controls width="100%"></video>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Shadcn UI, Tailwind CSS 4 |
| Backend | NestJS 11, TypeScript, Prisma 7, PostgreSQL 16 |
| Auth | JWT (passport-jwt), bcrypt |
| Testing | Jest + Supertest (backend), Playwright (frontend) |
| CI/CD | GitHub Actions |
| Package Manager | pnpm |
| Runtime | Node.js v22 |

## Features

- **JWT Authentication** — Register, login, and session management with bcrypt-hashed passwords and short-lived tokens
- **Todo CRUD** — Create, read, update, and delete todos with optional descriptions
- **User Data Isolation** — Every query is scoped by `userId` at the service layer; users can never access each other's data
- **Pagination** — Server-side pagination with configurable page size
- **Dark / Light Mode** — Theme toggle with smooth CSS transitions, powered by `next-themes`
- **Layout Toggle** — Switch between compact list and card grid view, persisted in localStorage
- **Bear Stickers** — Each todo gets a random bear sticker based on its ID
- **Responsive Design** — Mobile-first layout that adapts from single column to two-column grid

## Project Structure

```
bearo/
├── backend/             # NestJS API (port 3001)
│   ├── src/
│   │   ├── auth/        # Register, login, JWT strategy, guards
│   │   ├── todos/       # CRUD operations, user-scoped queries
│   │   ├── users/       # User entity and service
│   │   └── prisma/      # Database connection (global module)
│   ├── test/            # E2E tests (Supertest)
│   └── prisma/          # Schema and migrations
│
├── frontend/            # Next.js App Router (port 3000)
│   ├── src/
│   │   ├── app/         # Pages: home, dashboard
│   │   ├── components/  # UI components, auth dialogs, todo list
│   │   ├── context/     # AuthContext provider
│   │   ├── hooks/       # useTodos, useLayoutPreference
│   │   └── lib/         # Axios client, utilities, stickers
│   └── e2e/             # Playwright tests
│
├── specs/               # Documentation (workflow guides)
├── docker-compose.yml   # PostgreSQL container
└── PLAN.md              # Architecture and project plan
```

## Getting Started

### Prerequisites

- Node.js v22+
- pnpm
- Docker (for PostgreSQL)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/idn03/bearo.git
cd bearo

# 2. Start PostgreSQL
docker compose up -d

# 3. Install dependencies
cd backend && pnpm install
cd ../frontend && pnpm install

# 4. Configure environment variables
# Backend — create backend/.env
cp backend/.env.example backend/.env

# Frontend — create frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > frontend/.env.local

# 5. Run database migrations
cd backend && npx prisma migrate dev

# 6. Start both servers
cd backend && pnpm run start:dev   # API on http://localhost:3001
cd frontend && pnpm run dev        # App on http://localhost:3000
```

### Environment Variables

**Backend** (`backend/.env`):

```env
DATABASE_URL=postgresql://bearo:bearo@localhost:5432/bearo_dev
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=15m
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## API Endpoints

All routes are prefixed with `/api`.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account | No |
| POST | `/api/auth/login` | Authenticate, return JWT | No |
| GET | `/api/auth/profile` | Get current user info | Yes |
| GET | `/api/todos` | List user's todos (paginated) | Yes |
| POST | `/api/todos` | Create a todo | Yes |
| GET | `/api/todos/:id` | Get a single todo | Yes |
| PATCH | `/api/todos/:id` | Update a todo | Yes |
| DELETE | `/api/todos/:id` | Delete a todo | Yes |

## Testing

### Backend

```bash
cd backend
pnpm test          # 17 unit tests (AuthService, TodosService)
pnpm test:e2e      # 29 E2E tests (auth flow, todo CRUD, data isolation)
pnpm test:cov      # Unit tests with coverage
```

### Frontend

```bash
cd frontend
npx playwright install --with-deps   # First time only
pnpm test:e2e                        # 13 Playwright E2E tests
npx playwright test --ui             # Interactive UI mode
```

See [`specs/TESTING_GUIDE.md`](specs/TESTING_GUIDE.md) for detailed testing documentation.

## CI/CD

GitHub Actions runs on every push and pull request to `main` and `develop`:

1. **Backend** — lint, typecheck, migrate, unit tests, E2E tests, build
2. **Frontend** — lint, typecheck, build
3. **Playwright E2E** — full browser tests against running backend + frontend

## Development Roadmap

- [x] Phase 1 — Project Setup
- [x] Phase 2 — Authentication
- [x] Phase 3 — Todo CRUD
- [x] Phase 4 — UI Enhancements
- [x] Phase 5 — Testing
- [x] Phase 6 — CI/CD

## License

This project is for learning purposes.
