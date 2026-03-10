# Authentication Flow

## Overview

Bearo uses JWT (JSON Web Token) authentication. The backend issues a signed token on login/register, and the frontend stores it in localStorage to authenticate subsequent API requests.

## Registration

1. User clicks **Register** in the header, opening a dialog
2. User enters a username (3-30 chars) and password (min 8 chars)
3. Frontend sends `POST /api/auth/register` with `{ username, password }`
4. Backend validates the DTO, checks for duplicate username (returns 409 if taken)
5. Backend hashes the password with bcrypt (10 salt rounds) and creates the user in PostgreSQL
6. Backend signs a JWT with payload `{ sub: userId, username }` and returns `{ accessToken }`
7. Frontend stores the token in localStorage and fetches the user profile

## Login

1. User clicks **Log in** in the header, opening a dialog
2. User enters username and password
3. Frontend sends `POST /api/auth/login` with `{ username, password }`
4. Backend finds the user by username (returns 401 if not found)
5. Backend compares the password with the stored hash using bcrypt (returns 401 if wrong)
6. Backend signs a JWT and returns `{ accessToken }`
7. Frontend stores the token in localStorage and fetches the user profile

## JWT Token

- **Payload**: `{ sub: userId, username, iat, exp }`
- **Expiration**: Configured via `JWT_EXPIRATION` env var (default: 15 minutes)
- **Storage**: `localStorage.setItem("token", accessToken)`
- **Transmission**: Attached to every API request via Axios request interceptor as `Authorization: Bearer <token>`

## Determining Auth State

The `AuthProvider` (React Context) manages authentication state:

1. On app mount, checks localStorage for a stored token
2. If a token exists, calls `GET /api/auth/profile` to validate it and fetch user data
3. If the profile request succeeds, the user is authenticated (`user` is set)
4. If the profile request fails (expired/invalid token), the token is cleared and the user is unauthenticated
5. While this check runs, `isLoading` is `true` — the header shows a placeholder

## Logout

1. User clicks the gear icon in the header and selects **Logout** from the dropdown
2. Frontend removes the token from localStorage
3. Frontend sets `user` to `null` and `token` to `null`
4. Frontend redirects to `/`

## Token Expiration Handling

The Axios response interceptor catches 401 errors globally:
- Removes the token from localStorage
- Redirects to `/login`

This handles cases where a token expires mid-session.

## UI Behavior Based on Auth State

| State | Header (right side) |
|-------|-------------------|
| Loading | Empty placeholder |
| Not authenticated | Log in button, Register button, Theme toggle |
| Authenticated | Settings gear icon with dropdown (Toggle theme, Logout) |

## Rate Limiting

The `POST /api/auth/register` and `POST /api/auth/login` endpoints are rate-limited to 10 requests per minute per IP using `@nestjs/throttler`.

## Backend Route Protection

Protected endpoints use `JwtAuthGuard`:
1. Guard extracts the Bearer token from the Authorization header
2. `JwtStrategy` verifies the token signature and expiration using the JWT_SECRET
3. If valid, `req.user` is set to `{ sub: userId, username }`
4. If invalid/missing, a 401 Unauthorized response is returned
