# Library System

A full-stack library management app built for the **“Book Library Management Challenge (Senior Edition)”**.

- **Backend**: NestJS (TypeScript), PostgreSQL, TypeORM (with migrations), JWT, Swagger.
- **Frontend**: React + TypeScript, Vite, Tailwind, React Router, Axios.

It implements all **core user stories** and most **advanced senior-level stories**, with a focus on **clear API design, concurrency safety (via atomic DB updates), and test coverage**.

---

## 1. How this project maps to the assignment

### Core user stories

- **Authentication required**  
  - Implemented via JWT in the backend (`auth` module + `JwtStrategy`) and `AuthContext` + route guards in the frontend (`PrivateRoute`, `AdminRoute`).

- **Add new book (title, author, ISBN, year, cover image)**  
  - Backend `BooksModule` exposes CRUD endpoints accepting DTOs with those fields and optional cover file (multipart upload).  
  - Frontend `AddBookPage` provides a form including cover upload.

- **View list of all books**  
  - Backend: `GET /api/books` with optional filters.  
  - Frontend: `BooksListPage` displays paginated/filterable list.

- **Search by title or author**  
  - Backend supports query parameters (title/author) in the books list endpoint.  
  - Frontend search bar calls that endpoint as the user filters.

- **View book detail**  
  - Backend: `GET /api/books/:id`.  
  - Frontend: `BookDetailPage`.

- **Update book**  
  - Backend: `PATCH /api/books/:id`.  
  - Frontend: `BookEditPage`.

- **Borrow a book (decrement available quantity)**  
  - Backend: `BorrowingsService.borrow` runs in a DB transaction and uses a single conditional `UPDATE` statement to atomically decrement `availableQuantity` only when a copy is available.  
  - Frontend: borrow actions from book detail or list.

- **Return a book (increment available quantity)**  
  - Backend: `BorrowingsService.return` atomically marks the borrowing as returned and then atomically increments the book’s `availableQuantity` (without exceeding `totalQuantity`).  
  - Frontend: return actions via the user’s active borrowings view.

### Advanced (senior) user stories

- **Admin manages users and roles (admin, librarian, member)**  
  - Backend: `UsersModule` with role field (`Role` enum: `admin`, `librarian`, `member`) and role-based guards.  
  - Frontend: `UsersPage` behind `AdminRoute`.

- **Librarian views borrowing history & most borrowed books**  
  - Backend: `BorrowingsService.historyForBook` and `mostBorrowed` queries.  
  - Frontend: librarian views can call those endpoints (API-ready).

- **Safe concurrent borrowing**  
  - Backend: `BorrowingsService` uses **TypeORM transactions around atomic `UPDATE` statements** on the book and borrowing rows; unit tests include “two concurrent requests” simulations that verify correct behavior (only one succeeds).

- **Clear API documentation**  
  - Backend: Swagger at `http://localhost:3000/api/docs` via `DocumentBuilder` + `SwaggerModule`.

---

## 2. Tech stack & architecture

### Backend

- **NestJS** with modular architecture:
  - `modules/auth`: login, JWT issuing, `JwtStrategy`.
  - `modules/users`: user CRUD, role management.
  - `modules/books`: book CRUD, search/filter.
  - `modules/borrowings`: borrow/return, history, most borrowed, concurrency-safe logic.
  - `common`: global validation pipe, exception filter, logging interceptor, role guard, JWT guard.
  - `database`: TypeORM configuration, migrations, and seed scripts.
  - `infrastructure`: Redis module, storage abstraction (local/S3) for cover images.

- **Database**: PostgreSQL via TypeORM (`User`, `Book`, `Borrowing` entities), with schema managed via **explicit migrations** (no `synchronize` in runtime config).

- **Auth**: JWT bearer tokens, RBAC via a `Role` enum and guards.

- **File upload**: Nest + Multer; optional S3 integration through `StorageProvider`.

- **API style**: REST with OpenAPI/Swagger.

### Frontend

- **React + TypeScript** with Vite.

- **Routing**: `react-router-dom` with:
  - `PrivateRoute` for authenticated routes.
  - `AdminRoute` for admin-only pages.

- **State / auth**: `AuthContext` that stores JWT in `localStorage` and injects it via Axios interceptor.

- **UI**: Tailwind-based views for login, books, and users; `react-hot-toast` for feedback.

- **API client**: `shared/api/client.ts` with base URL from `VITE_API_BASE_URL` and 401 handling (auto logout + redirect).

---

## 3. Setup & running

### Prerequisites

- **Node.js** 18+ (LTS)
- **PostgreSQL** 14+ (local or remote)
- **npm** (or pnpm/yarn)

### Environment configuration

#### Backend (`backend/.env`)

Use `backend/.env.example` as a starting point.

Key variables:

| Variable | Description | Default / note |
|----------|-------------|----------------|
| `LIBRARY_SERVICE_CONNECTION` | Bind host | `0.0.0.0` |
| `LIBRARY_SERVICE_PORT` | API port | `3000` |
| `LIBRARY_SERVICE_CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `LIBRARY_SERVICE_DB_HOST` | PostgreSQL host | `localhost` |
| `LIBRARY_SERVICE_DB_PORT` | PostgreSQL port | `5432` |
| `LIBRARY_SERVICE_DB_USER` | DB user | `postgres` |
| `LIBRARY_SERVICE_DB_PASS` | DB password | `postgres` |
| `LIBRARY_SERVICE_DB_NAME` | DB name | `library_db` |
| `JWT_SECRET` | JWT signing secret | `dev-secret` (override in prod) |
| `REDIS_URL` | Redis connection | Optional |
| `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 config | Optional; if unset, covers stay local/optional |

#### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Install & run (local dev)

#### Backend

```bash
cd backend
cp .env.example .env
# Edit .env as needed
npm install
npm run migration:run
npm run start:dev
```

- API base: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173`

### Seed data

From `backend`:

```bash
# 0. Ensure migrations have been applied at least once
npm run migration:run

# 1. Users (admin, librarian, member — password: password123)
npm run seed:users

# 2. Books (sample tech library, idempotent by ISBN)
npm run seed:books
```

Example login: `admin@example.com` / `password123`.

### Full-stack with Docker Compose

If you prefer to run **DB + backend + frontend** together via Docker:

```bash
cd /path/to/library-system
cp backend/.env.example backend/.env
# Edit backend/.env as needed (DB creds, JWT_SECRET, etc.)

docker-compose up --build
```

- PostgreSQL: internal service `db` (exposed on host `5432`).
- Backend API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Frontend app: `http://localhost:5173`

---

## 4. Testing

### Backend

From `backend`:

```bash
npm test           # Unit tests (Jest)
npm run test:cov   # Coverage
npm run test:watch # Watch mode
```

Highlights:

- Unit tests for auth, users, books, borrowings, and infrastructure (Redis, storage).
- Borrow/return tests cover:
  - Error paths (no copies, user not found, already returned, wrong user).
  - Correct behavior of atomic stock updates on book/borrowing rows under contention.
  - Simulated concurrent borrow/return requests where only one succeeds.

### Frontend

From `frontend`:

```bash
npm run lint
```

No frontend test runner is wired by default; Vitest/RTL can be added if needed.

---

## 5. Concurrency & race-condition handling

- **Borrow** (`BorrowingsService.borrow`):
  - Runs inside a database transaction via `DataSource.transaction`.
  - Uses a single conditional `UPDATE` on `Book`:
    - `availableQuantity` is decremented with an expression like `"availableQuantity" - 1`.
    - The `WHERE` clause ensures `"availableQuantity" > 0`, so the row is only updated when stock is available.
  - If the `UPDATE` affects **no rows**, the service checks whether the book exists:
    - If it does not exist, the request fails with `"Book not found"`.
    - If it exists but stock is exhausted, the request fails with `"No copies available"`.
  - With two concurrent borrows for the same book:
    - Both transactions attempt the same atomic `UPDATE`.
    - PostgreSQL ensures that only one succeeds (the other sees 0 rows updated and fails with `"No copies available"` once stock is depleted).

- **Return** (`BorrowingsService.return`):
  - Runs inside a database transaction via `DataSource.transaction`.
  - First performs an atomic `UPDATE` on `Borrowing` to set `returnedAt` (e.g. `NOW()`) with a `WHERE` that enforces:
    - Matching `id`.
    - `returnedAt IS NULL` (not already returned).
    - Matching `userId` (belongs to the requesting user).
  - If the `UPDATE` touches no rows, the service inspects the borrowing to distinguish between:
    - Not found.
    - Already returned.
    - Wrong user.
  - Once the borrowing is successfully marked as returned, it performs another atomic `UPDATE` on `Book`:
    - Increments `availableQuantity` with an expression like `LEAST("totalQuantity", "availableQuantity" + 1)` to avoid ever exceeding `totalQuantity`.
  - Concurrent returns for the same borrowing:
    - The first transaction wins and marks it returned.
    - Subsequent attempts see 0 rows updated and surface `"Already returned"` (or another specific error) as appropriate.

This design pushes concurrency control to the **database** via **atomic conditional `UPDATE` statements**, which is the right place to guarantee consistency under real multi-process load.

---

## 6. Production improvements & trade-offs

### What to improve for real-world production

- **Database & schema**
  - Continue evolving the schema via **migrations only** (no `synchronize`); add new migrations for each structural change.
  - Apply connection pooling, backups, and (if needed) replicas.

- **Security**
  - Strong `JWT_SECRET` and environment-specific config.
  - Rate limiting on login and sensitive endpoints.
  - Consider using httpOnly cookies or short-lived access tokens + refresh tokens instead of storing JWT in `localStorage`.
  - Enforce HTTPS and strict CORS.

- **Observability**
  - Centralized structured logs.
  - Metrics + health checks (e.g. `/api/health`).
  - Tracing across services if the system grows.

- **Storage**
  - Use S3 (or similar) in production for covers; avoid purely local disk.

- **DevOps**
  - Dockerfiles and Kubernetes manifests are included, along with a GitHub Actions **CI** workflow. CD is intentionally not wired yet and will be added once the target runtime/platform is chosen.

### Key trade-offs made here

- **Using migrations (no `synchronize` at runtime)** for safe schema evolution vs. faster, more dangerous auto-sync.
- **JWT in `localStorage`** for simplicity vs. more secure cookie-based tokens.
- **Atomic `UPDATE` statements** for borrow/return (simple, robust) vs. optimistic locking (better throughput but more complex conflict handling).
- **Monorepo (frontend + backend)** for clarity vs. separate repos for independent deployment pipelines.

These choices favor **clarity and speed for an assignment** while keeping a clear path to hardening the system for production.

