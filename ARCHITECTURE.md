# Church Clerk — Architecture Overview

## Project Structure

```
church-clerk/
├── church-clerk-frontend/   React SPA (Vite + TailwindCSS)
├── church-clerk-backend/    Node.js REST API (Express + MongoDB)
└── church-clerk-admin/      Admin panel
```

---

## Frontend (`church-clerk-frontend`)

### Stack
- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS v4
- **Routing**: React Router DOM v7
- **Data fetching / cache**: TanStack React Query v5
- **HTTP client**: Axios (configured in `src/shared/services/http.js`)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Toasts**: React Toastify

### Key Directories
| Path | Purpose |
|------|---------|
| `src/app/` | App entry, router, routes |
| `src/layouts/` | Page layout shells (Auth, Dashboard, etc.) |
| `src/features/` | Feature modules (auth, dashboard, members, finance, …) |
| `src/shared/` | Reusable components, hooks, services, utilities |
| `src/styles/` | Global CSS overrides |

### Context Providers (applied in `main.jsx`)
1. `QueryClientProvider` — React Query
2. `ChurchProvider` — Active church context (HQ / branch switching)
3. `PermissionProvider` — RBAC permission helpers
4. `AuthProvider` — Session restore, login/logout

### Church Context (HQ / Branch)
- `activeChurch` — currently viewed church
- `hqChurch` / `branchChurch` — stored when monitoring a branch
- `isMonitoringBranch` — true when HQ user is viewing a branch
- `quickSwitchToHq()` / `quickSwitchToBranch()` — instant UI switch (no API call)
- `switchChurch(id)` — full API-backed switch

### HTTP Interceptors (`src/shared/services/http.js`)
- Attaches `Authorization: Bearer <token>` from localStorage / sessionStorage (fallback only — backend prefers the httpOnly cookie)
- Attaches `x-active-church` header from localStorage (respects per-request override)
- Fetches and attaches CSRF token for all state-changing requests (POST/PUT/PATCH/DELETE)
- Auto-retries once on CSRF 403 with a fresh token
- Globally handles 401 (clear session), 402 (subscription locked modal), toast errors

---

## Backend (`church-clerk-backend`)

### Stack
- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **Database**: MongoDB via Mongoose
- **Auth**: JWT stored in httpOnly cookies (`token`, `userToken`, `adminToken`) — primary; Bearer header — fallback
- **Validation**: Joi schemas in `validators/` applied to all write routes
- **Email**: Resend
- **SMS**: Africa's Talking
- **Payments**: Paystack
- **Security**: Helmet, CORS, CSRF (cookie-based), rate limiting, mongo-sanitize, XSS sanitization

### Security Middleware Order (`server.js`)
1. `express.json()` — body parsing
2. `mongo-sanitize` — NoSQL injection protection
3. XSS sanitization — custom recursive string sanitizer
4. `helmet` — secure HTTP headers
5. Rate limiting — 300 GET req/min, 30 write req/min per IP
6. `cookie-parser` — cookie parsing
7. CSRF protection — custom cookie-based CSRF middleware

### CSRF Implementation
- Secret stored in `_csrf` httpOnly cookie
- Token returned from `GET /api/v1/csrf-token`
- Token verified on all state-changing requests via `CSRF-Token` header
- Frontend auto-fetches on page load and retries on failure

### Key Route Prefixes
| Prefix | Module |
|--------|--------|
| `/api/v1/auth` | Authentication |
| `/api/v1/user` | User profile |
| `/api/v1/church` | Church management |
| `/api/v1/dashboard` | Dashboard KPIs and analytics |
| `/api/v1/member` | Member management |
| `/api/v1/event` | Events and attendance |
| `/api/v1/subscription` | Billing and subscriptions |
| `/api/v1/notifications` | In-app notifications |
| `/api/v1/reports-analytics` | Reports |
| `/api/csrf-token` | CSRF token endpoint |

---

## Environment Variables

See `.env.example` in each app directory for the full list of required variables.

---

## Deployment

- **Frontend**: Netlify (static build via `vite build`)
- **Backend**: Node.js server (PM2 recommended for process management)
- **Database**: MongoDB Atlas (production)

### Frontend env for production
Set `VITE_API_BASE_URL=https://api.churchclerkapp.com/api/v1` in the Netlify environment variables dashboard.
