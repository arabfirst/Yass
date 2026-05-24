# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Police Management System - نظام إدارة الشرطة (ARAB FIRST Police Department)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 20
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (Replit built-in) + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (for server bundle)
- **Auth**: express-session + connect-pg-simple (custom session-based, no external auth)
- **Frontend**: React 19 + Vite, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS 4

## Default Admin Credentials

- **Username**: 100
- **Password**: 1001

## Workflows

- **Start application** — runs the Express API server on port 8080
- **Start frontend** — runs the Vite dev server on port 5000 (webview)

The frontend proxies `/api/*` requests to the API server at `http://localhost:8080`.

## Structure

```text
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   └── my-website/         # React + Vite frontend (port 5000)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts        # Admin users table
│           ├── soldiers.ts     # Soldiers table (with ranks)
│           ├── attendance.ts   # Check-in/check-out records
│           ├── warnings.ts     # Soldier warnings
│           ├── activity_logs.ts # Activity audit log
│           ├── sessions.ts     # Session store table
│           └── characters.ts   # Character/citizen records
├── scripts/                # post-merge.sh (runs pnpm install + db push)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Tables

All tables are created in the Replit PostgreSQL database:
- `users` — Admin users
- `soldiers` — Soldiers with rank, unit, points, busy status
- `attendance` — Daily check-in/check-out records
- `warnings` — Warnings issued to soldiers
- `activity_logs` — Audit trail of all actions
- `session` — Express session store (connect-pg-simple)
- `characters` — Citizen/character records for search

## Features

- Session-based authentication (admin and soldier roles)
- Soldiers management (add, edit, delete, ranks system)
- Daily attendance tracking (check-in / check-out with timestamps)
- Warnings system
- Points system
- Busy status tracking
- Dashboard with stats
- Arabic RTL UI with dark navy police theme
- Citizen/character search page
- Activity logs audit trail
- Radar page

## API Endpoints

- `POST /api/auth/login` — Login (checks users table then soldiers table)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user
- `GET /api/healthz` — Health check
- `GET /api/soldiers` — List soldiers
- `POST /api/soldiers` — Add soldier
- `PATCH /api/soldiers/:id` — Update soldier
- `DELETE /api/soldiers/:id` — Delete soldier
- `GET /api/warnings` — List warnings
- `POST /api/warnings` — Add warning
- `GET /api/activity-logs` — List activity logs
- `GET/POST /api/characters` — Character search/management
- `GET /api/radar` — Radar data

## Root Scripts

- `pnpm run build` — typecheck then build all packages
- `pnpm run typecheck` — run tsc across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to database
