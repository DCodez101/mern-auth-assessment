# MERN Auth — Ember Terminal

A full MERN-stack authentication system with short-lived access tokens and
long-lived, rotating refresh tokens. Built as a plain two-folder project
(`client` + `server`), no monorepo tooling.

## Architecture

**Stack:** MongoDB (Mongoose) · Express · React (Vite) · JWT

**Two-token model:**

| Token | Lifetime | Where it lives | Purpose |
|---|---|---|---|
| Access token | ~15 min | In-memory only (JS variable / React state, never `localStorage`) | Sent as `Authorization: Bearer <token>` on every API request |
| Refresh token | ~7 days | `httpOnly`, `secure` (prod), `sameSite` cookie, scoped to `/api/auth` | Used only to mint new access tokens |

Storing the access token in memory (not `localStorage`/`sessionStorage`)
means it's inaccessible to any injected JS (XSS), and it naturally clears
on tab close or full reload. The refresh token is `httpOnly`, so
client-side JS can never read it either — the only thing that can use it
is the browser automatically attaching it to requests to `/api/auth/*`.

**Session flow:**

1. **Signup / Login** → server verifies credentials, issues an access
   token in the JSON response body and sets the refresh token as an
   `httpOnly` cookie. The refresh token is also stored server-side in a
   `RefreshToken` collection (so it can be revoked, not just left to
   expire).
2. **Every request while logged in** → access token attached via an axios
   request interceptor (`client/src/services/api.js`).
3. **Access token expires (401 response)** → an axios response
   interceptor catches the 401, calls `/api/auth/refresh` (which reads
   the refresh cookie automatically, no code needed to attach it), gets a
   new access token, retries the original request once. Concurrent 401s
   are queued so only one refresh call fires at a time.
4. **On refresh**, the old refresh token is revoked and a brand-new one
   issued (rotation) — the DB record, not just the JWT signature, is
   checked, so a revoked/already-used token is rejected even if it hasn't
   technically expired yet. If a revoked token is presented again (reuse
   detection — a signal of token theft), every active session for that
   user is revoked.
5. **Page reload** → React state is gone, so `AuthContext` silently calls
   `/api/auth/refresh` once on mount using the still-present cookie to
   restore the session without asking the user to log in again.
6. **Logout** → refresh cookie cleared and its DB record deleted.

## Folder structure

```
server/
  config/db.js              MongoDB connection
  models/User.js            bcrypt password hashing, toSafeObject()
  models/RefreshToken.js    stored tokens, TTL index for auto-cleanup
  controllers/authController.js   signup / login / refresh / logout
  controllers/userController.js   GET /api/users/me
  middleware/authMiddleware.js    verifies access token (Bearer header)
  middleware/errorHandler.js      centralized error responses
  utils/generateTokens.js         signs access + refresh JWTs
  routes/                         authRoutes.js, userRoutes.js
  server.js

client/
  src/services/api.js        axios instance, refresh interceptor
  src/context/AuthContext.jsx  global auth state (user, access token)
  src/hooks/useAuth.js        convenience hook over AuthContext
  src/components/Navbar.jsx
  src/components/ProtectedRoute.jsx   redirects to /login if not authed
  src/pages/Login.jsx, Signup.jsx, Dashboard.jsx
  src/App.jsx, main.jsx
```

## Running locally

**Requirements:** Node.js 18+, a MongoDB instance (local or Atlas).

### 1. Server
```bash
cd server
cp .env.example .env   # fill in MONGO_URI, JWT secrets, CLIENT_ORIGIN
npm install
npm run dev
```
Runs on `http://localhost:5000`. You should see `Server running on port 5000`
and a MongoDB connection log line.

### 2. Client
```bash
cd client
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:5000/api
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### 3. Try it
Sign up → land on Dashboard → refresh the page (session persists via the
refresh cookie) → Logout → cookie cleared, redirected to Login.

## Environment variables

**`server/.env`**
```
PORT=5000
NODE_ENV=development
MONGO_URI=<your MongoDB connection string>
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=<random string, e.g. `openssl rand -hex 64`>
JWT_REFRESH_SECRET=<a different random string>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
REFRESH_TOKEN_EXPIRY_MS=604800000
```

**`client/.env`**
```
VITE_API_URL=http://localhost:5000/api
```

## Security notes

- Passwords hashed with bcrypt before storage; never returned in any API response.
- Access tokens never touch `localStorage`/`sessionStorage` — memory only.
- Refresh tokens are `httpOnly` + rotated on every use + checked against a
  server-side DB record so a single stolen token can be revoked instead of
  remaining valid until natural expiry.
- CORS locked to a single explicit origin with `credentials: true`
  (required for the cookie to be sent/accepted; can't be used with a
  wildcard `*` origin).
- Refresh tokens include a random `jti` claim so two tokens issued for the
  same user in the same second are never identical strings (avoids a
  database unique-constraint collision).
