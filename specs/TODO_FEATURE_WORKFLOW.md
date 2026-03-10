# Todo Feature Workflow

## Overview

The todo management feature allows authenticated users to create, view, edit, toggle completion, and delete personal tasks. Each user's todos are completely isolated — users can only access their own data.

## Creating Todos

1. User fills in the title (required, max 255 chars) and optional description in the dashboard form
2. Frontend sends `POST /api/todos` with the JWT token in the Authorization header
3. Backend `JwtAuthGuard` validates the token and extracts `userId` from the JWT payload (`req.user.sub`)
4. `TodosService.create()` creates the todo with the `userId` attached, ensuring ownership
5. The new todo is returned and the list refreshes

## Retrieving Todos

1. Dashboard page loads and `useTodos` hook fires `GET /api/todos?page=1&limit=10`
2. Backend extracts `userId` from the JWT and queries **only** todos where `userId` matches
3. Response includes `{ data: Todo[], total: number, page: number, limit: number }`
4. Pagination is handled via `page` and `limit` query parameters
5. Todos are ordered by `createdAt` descending (newest first)

## Updating & Toggling Completion

1. User clicks the edit icon to enter inline edit mode, or clicks the circle/check icon to toggle completion
2. Frontend sends `PATCH /api/todos/:id` with the changed fields (`title`, `description`, and/or `completed`)
3. `TodosService.update()` first calls `findOne(id, userId)` to verify the todo belongs to the user
4. If the todo doesn't exist or belongs to another user, a `404 NotFoundException` is thrown
5. Only after ownership verification does the update proceed
6. The updated todo is returned and the UI updates in place

## Deleting Todos

1. User clicks the trash icon on a todo
2. Frontend sends `DELETE /api/todos/:id`
3. `TodosService.remove()` verifies ownership via `findOne(id, userId)` before deleting
4. After deletion, the todo list re-fetches to update pagination counts

## User Data Isolation

Data isolation is enforced at the **service layer**, not the controller:

- Every `TodosService` method requires a `userId` parameter
- `findAll()` filters with `WHERE userId = ?`
- `findOne()`, `update()`, and `remove()` all use `findFirst({ where: { id, userId } })` — matching both the todo ID **and** the user ID
- If a user tries to access another user's todo, they receive a `404 Not Found` (not `403 Forbidden`), preventing information leakage about other users' data

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/todos` | List user's todos (paginated) | Required |
| `GET` | `/api/todos/:id` | Get a single todo | Required |
| `POST` | `/api/todos` | Create a new todo | Required |
| `PATCH` | `/api/todos/:id` | Update todo fields | Required |
| `DELETE` | `/api/todos/:id` | Delete a todo | Required |

### Query Parameters (GET /api/todos)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number (min: 1) |
| `limit` | number | 10 | Items per page (min: 1, max: 100) |

### Request Body (POST /api/todos)

```json
{
  "title": "string (required, max 255)",
  "description": "string (optional)"
}
```

### Request Body (PATCH /api/todos/:id)

```json
{
  "title": "string (optional, max 255)",
  "description": "string (optional)",
  "completed": "boolean (optional)"
}
```
