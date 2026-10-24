# TimeLens

TimeLens is a personal productivity tracker with a React/Vite frontend, an
Express API, and PostgreSQL storage. It supports daily hourly logs, goals,
analytics, reminders, check-ins, experiments, and a 100-day challenge.

## Run locally

### Prerequisites

- Node.js 20 or newer (the project was last verified with Node 24)
- npm
- A running PostgreSQL server

### First-time setup

From the project root, install all workspace dependencies:

```bash
npm install
```

Create a local database named `timelens` (using your PostgreSQL user):

```bash
createdb timelens
```

Copy the backend environment template and update it if your PostgreSQL user,
password, host, or port differs from the example:

```bash
cp backend/.env.example backend/.env
```

At minimum, set `DATABASE_URL` to a valid PostgreSQL connection string and
replace `SESSION_SECRET` with a long random value. For example:

```dotenv
DATABASE_URL="postgresql://your-user:your-password@127.0.0.1:5432/timelens?schema=public"
BACKEND_PORT=3001
FRONTEND_ORIGIN="http://localhost:5173"
SESSION_SECRET="a-long-random-local-development-secret"
```

Apply the existing database migrations and add the default time categories:

```bash

```

Start the frontend and backend together:

```bash
npm run dev
```

Or start each service in its own terminal from the project root:

```bash
# Terminal 1 — API (requires backend/.env)
npm run dev --workspace=backend

# Terminal 2 — web app
npm run dev --workspace=frontend
```

Then open [http://localhost:5173](http://localhost:5173). Register a new
account in the app to begin using TimeLens. The API health check is available
at [http://localhost:3001/api/health](http://localhost:3001/api/health).

Press `Ctrl+C` in the terminal to stop both development servers.

## Useful commands

```bash
npm run build  # build frontend and backend
npm run lint   # type-check frontend and backend
npm test       # run backend tests
```

## Project structure

```text
frontend/  React + TypeScript + Vite user interface
backend/   Express API, Prisma schema, migrations, and seed script
docs/      Architecture notes
```

## Troubleshooting

- **Database connection error:** Confirm PostgreSQL is running and that
  `backend/.env` has the correct `DATABASE_URL`.
- **Port already in use:** Change `BACKEND_PORT` in `backend/.env` for the API;
  if needed, update the frontend Vite configuration and `FRONTEND_ORIGIN` to
  use a matching frontend port.
- **Missing categories:** Re-run `npm run db:seed --workspace=backend`. The
  seed operation is safe to repeat.
