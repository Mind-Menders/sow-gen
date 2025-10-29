# sow-gen
SOW (Statement of Work) Generator

This repository is a full-stack SOW generator app. It includes a React + Vite frontend and an Express + TypeScript backend. The project uses MongoDB for primary storage (migration helpers exist to move data from PostgreSQL). All references to Replit services have been removed and replaced with local/hackathon-oriented configuration.

## Tech stack

- Frontend
	- React 18
	- Vite
	- TypeScript
	- Tailwind CSS
	- Radix UI components
- Backend
	- Node.js (ESM), Express
	- TypeScript
	- Drizzle ORM (used previously for Postgres data access and for migration scripts)
	- MongoDB (Mongoose) — primary data store after migration
	- bcrypt (password hashing)
	- express-session + connect-mongo (session storage in MongoDB)
	- passport / passport-local (local auth scaffolding)

## Prerequisites

- Node.js (v18+ recommended) and npm
- Git
- MongoDB Community Server (installed and running as a service)
- (Optional) PostgreSQL if you plan to migrate data from an existing Postgres instance

On Windows you can install MongoDB Community Server from https://www.mongodb.com/try/download/community and run it as a service.

## Environment

Create a `.env` file in the repository root (copy from `.env.example` if present) and set the following variables:

```
MONGODB_URI=mongodb://127.0.0.1:27017/sow_gen
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret_here
OPENAI_API_KEY=your_openai_api_key_here
```

If you have an existing PostgreSQL database you want to migrate from, you may also keep the Postgres connection env vars during migration:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sow_gen_db
DB_USER=postgres
DB_PASSWORD=admin
```

## Install dependencies

From the repo root:

```powershell
npm install
```

## Database migration (Postgres -> MongoDB)

The repo contains migration scripts that will read from the existing Postgres schema and write documents into MongoDB. Only run these if you are migrating existing data.

1. Ensure PostgreSQL is running and the connection env vars (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) are set in your `.env`.
2. Ensure MongoDB is running and `MONGODB_URI` is set.
3. Run the migration script (TypeScript runtime `tsx` used by this repo):

```powershell
npx tsx server/migrate-data-v3.ts
```

4. Verify migration:

```powershell
npx tsx server/verify-migration.ts
```

Notes:
- The migration scripts intentionally use relaxed schemas while migrating to avoid strict validation failures. After migration you can enable stronger validation or transform documents if desired.

## Development

Run the app in development mode (starts backend + Vite dev server):

```powershell
npm run dev
```

This will run the TypeScript backend entry at `server/index.ts` and the Vite frontend. Backend listens on the port defined in `PORT` and the frontend proxies `/api` to that port.

## Build & Production

To build the client and bundle the server for production:

```powershell
npm run build
```

Then start the built server (after build step):

```powershell
NODE_ENV=production node dist/index.js
```

## Authentication

- The project uses bcrypt-hashed passwords and session-based auth (express-session). Local auth endpoints are provided in `server/auth.ts`. If you used previous Replit auth flows, they have been removed and replaced with local/hackathon-friendly auth.

If you need to update a plaintext password in MongoDB to a bcrypt hash, use the hashing helper in `server/auth.ts` or create a small script that uses `bcrypt.hash()` then updates the user document.

## Replit references

All Replit-specific plugins and references were removed in favor of local tooling. Any visible branding that previously referenced "Replit" has been replaced with "Hackathon" or neutral text.

## Troubleshooting

- MongoDB connection refused: ensure the MongoDB service is running and `MONGODB_URI` points to `127.0.0.1:27017` (using `127.0.0.1` avoids some IPv6/localhost resolution issues).
- Migration errors: double-check Postgres env vars, ensure `drizzle` schema matches your database, and run migration scripts with logs to identify missing fields.
- Missing environment variables: copy `.env.example` to `.env` and fill required values.

## Useful commands

```powershell
# Install deps
npm install

# Run migration (if migrating from Postgres)
npx tsx server/migrate-data-v3.ts
npx tsx server/verify-migration.ts

# Start dev server
npm run dev

# Build for production
npm run build

# Start built server
NODE_ENV=production node dist/index.js
```

## Contact / Next steps

If you want, I can:

- Remove the old Postgres-related code and Drizzle configuration entirely after you're confident on MongoDB
- Add stronger Mongoose schemas and indexing for production
- Add tests for the migration and a rollback plan

If you'd like one of those, tell me which and I'll implement it next.

