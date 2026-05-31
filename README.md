# Restaurant OS

A web + mobile platform for running a restaurant: rostering, photo clock-in,
payroll, reservations, table management, and Square reporting — with
role-based access for owners, managers, kitchen, and floor (bar + waitstaff).

This repository currently contains the **foundation milestone**:

- Authentication (login, JWT sessions)
- Role-based access control (4 roles, 4 positions)
- User / staff management
- A role-aware dashboard shell that every future module plugs into

Everything else (roster, clock-in, payroll, reservations, tables, Square) is
scaffolded as navigation + placeholder pages, ready to build out next.

---

## Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Backend    | Node.js, Express, TypeScript                        |
| Database   | PostgreSQL via Prisma ORM                           |
| Auth       | JWT (JSON Web Tokens), bcrypt password hashing      |
| Web app    | React, TypeScript, Vite, React Router               |
| Mobile app | React Native (added in a later milestone)           |

---

## Prerequisites

Install these on your laptop first:

1. **Node.js 18+** — https://nodejs.org (LTS version)
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop
   (used to run PostgreSQL locally with one command — no manual DB install)
3. **Git** — https://git-scm.com

Check they're installed:

```bash
node --version    # v18 or higher
docker --version
git --version
```

> No Docker? You can install PostgreSQL directly instead and just update
> `DATABASE_URL` in `backend/.env`. Docker is simply the easiest path.

---

## First-time setup

From the project root (`restaurant-os/`):

### 1. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432`. Confirm it's running with
`docker ps`.

### 2. Set up the backend

```bash
cd backend
cp .env.example .env          # then open .env and set a real JWT_SECRET
npm install
npm run prisma:generate       # generate the Prisma client
npm run prisma:migrate        # create the database tables (name it "init")
npm run db:seed               # add demo users
```

### 3. Set up the frontend

Open a **second terminal**, from the project root:

```bash
cd frontend
npm install
```

---

## Running the app (daily)

You need two terminals running at once.

**Terminal 1 — backend:**

```bash
cd backend
npm run dev          # API at http://localhost:4000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev          # web app at http://localhost:5173
```

Make sure Docker is running first (`docker compose up -d`).

Open **http://localhost:5173** and log in.

---

## Demo accounts

All seeded users share the password **`password123`**:

| Email                     | Role    | Sees                                  |
| ------------------------- | ------- | ------------------------------------- |
| owner@restaurant.test     | Owner   | Everything, including payroll & Square|
| manager@restaurant.test   | Manager | Everything except owner-only actions  |
| chef@restaurant.test      | Kitchen | Roster, clock-in, tables (KDS)        |
| bar@restaurant.test       | Floor   | + reservations (as host)              |
| wait@restaurant.test      | Floor   | + reservations (as host)              |

Log in as different users to see the sidebar and dashboard change by role.

---

## Project structure

```
restaurant-os/
├── docker-compose.yml        PostgreSQL for local dev
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      database models
│   │   └── seed.ts            demo users
│   └── src/
│       ├── index.ts           Express app entry
│       ├── config/            env loading
│       ├── lib/               prisma client, auth helpers
│       ├── middleware/        requireAuth, requireRole (RBAC)
│       └── routes/            auth, users
└── frontend/
    └── src/
        ├── api/               fetch client
        ├── auth/              AuthContext, route guards, nav config
        ├── components/        app shell / layout
        ├── pages/             login, dashboard, staff, placeholders
        └── styles/            design system
```

---

## Clock-in photos

The clock-in module uses the browser camera (`getUserMedia`). Browsers only
allow camera access on `https://` or on `localhost`, so it works in local dev
out of the box. When you deploy, the site must be served over HTTPS or the
camera won't start.

In local dev, captured photos are saved to `backend/uploads/` and served at
`/uploads/...`. That folder is gitignored, so photos never get committed. When
you move to production, swap `savePhoto` in `backend/src/lib/photoStorage.ts`
to upload to S3 (or similar) and return the object URL — nothing else changes.

## How role-based access works

There are two layers, and both matter:

1. **Frontend** (`src/auth/nav.ts`) hides links the user can't use. This is
   convenience only.
2. **Backend** (`src/middleware/auth.ts`) enforces the real rules.
   `requireRole('OWNER', 'MANAGER')` on a route is the actual security
   boundary — even if someone bypasses the UI, the API rejects them.

When you add a new module, guard its routes on the backend **and** add it to
the nav config with the right `roles` list.

---

## Useful commands

```bash
# Backend
npm run dev                # start API with hot reload
npm run prisma:studio      # visual database browser (great for inspecting data)
npm run db:seed            # re-seed demo users

# Database
docker compose up -d       # start postgres
docker compose down        # stop postgres (keeps data)
docker compose down -v     # stop and DELETE all data
```

---

## Roadmap

- [x] **Foundation** — auth, roles, user management, dashboard shell
- [x] **Roster management** — weekly grid, draft/publish, conflict detection
- [x] **Photo clock-in / out** — camera capture, shift matching, timesheets
- [x] **Payroll** — pay runs from clock-ins, payslips (simplified tax/super)
- [x] **Reservations** — day view, booking lifecycle, guest profiles
- [ ] Live table floor plan
- [ ] Square reporting integration
- [ ] React Native mobile app
```
