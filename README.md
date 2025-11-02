# sow-gen
SOW (Statement of Work) Generator

This repository is a full-stack SOW generator app. It includes a React + Vite frontend and an Express + TypeScript backend. The project uses MongoDB for primary storage.

## Tech stack

- Frontend
	# SOW-Gen (Statement of Work Generator)

	Full‑stack app for drafting, reviewing, and exporting enterprise SOWs. React + Vite frontend, Express + TypeScript backend, MongoDB primary storage (PostgreSQL and in‑memory fallbacks supported). AI features assist with section authoring, analysis, inline suggestions, chat, and section recommendations.

	## Highlights

	- SOW editor with rich text and table paste support (Quill custom table blot)
	- Workflows, approvals, reassignment, and audit trail
	- Exports to PDF and Word (.docx)
		- PDF: proper table pagination, repeated table headers across pages, and a repeating header/footer on every page
		- Word: semantic tables and headings
	- AI features (pluggable provider)
		- Generate content for a section
		- Analyze section quality (scores + issues/suggestions)
		- Inline writing suggestions
		- Chat about the current SOW
		- Suggest additional sections

	## Tech stack

	- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Radix UI
	- Backend: Node.js (ESM), Express, TypeScript
	- Storage: MongoDB (preferred), PostgreSQL (optional), in‑memory (dev fallback)
	- Auth: express-session, bcrypt; Mongo or Postgres-backed user store
	- Export: pdfkit (PDF), docx (Word)
	- AI Providers: OpenAI Integrations (default), Azure OpenAI SDK, or local Ollama

	## Project structure (top‑level)

	- `client/` — React app (Vite)
	- `server/` — Express API, auth, AI integration, export, storage
	- `shared/` — shared schema and config
	- `scripts/` — small maintenance utilities

	## Features

	### Editor and content
	- Rich text editor with headings/lists/code and embedded tables
	- Smart table paste: preserves HTML structure using a custom Quill blot
	- Auto‑save with debounce, per‑section editing, re‑ordering, add/rename/delete sections

	### Workflows and approvals
	- Multi‑stage workflows with reviewers per stage
	- Approve/mark reviewed, reassign reviewer, revert stage with remarks
	- Audit trail records actions (status changes, reviewer changes, edits)

	### Exports
	- PDF and Word exports from the SOW editor
	- Header and footer text fields in the export dialog
	- PDF export details
		- Repeating document header and footer on every page
		- Tables paginate correctly; header row is repeated on page breaks
		- Avoids mid‑page large gaps after long tables

	### AI assistance
	- Generate section content: `/api/ai/generate-content`
	- Analyze section quality: `/api/ai/analyze-section`
	- Inline suggestion while typing: `/api/ai/inline-suggestion`
	- Chat about the SOW: `/api/ai/chat`
	- Suggest additional sections: `/api/ai/suggest-sections`

	Provider selection via `AI_PROVIDER`:
	- `integrations` (default): existing OpenAI integrations client
	- `azure`: official Azure OpenAI SDK
	- `olama`: local Ollama server (offline)

	## Prerequisites

	- Node.js 18+ and npm
	- Git
	- MongoDB Community Server (recommended) or PostgreSQL (optional)

	Windows: install MongoDB Community Server from https://www.mongodb.com/try/download/community and run it as a service.

	## Environment configuration

	Create a `.env` in repo root. Minimum:

	```ini
	# Core server
	PORT=3000
	NODE_ENV=development
	SESSION_SECRET=your_session_secret_here

	# Storage (prefer MongoDB)
	MONGODB_URI=mongodb://127.0.0.1:27017/sow_gen

	# AI provider selection
	AI_PROVIDER=integrations  # integrations | azure | olama

	# OpenAI integrations (default provider)
	AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
	AI_INTEGRATIONS_OPENAI_API_KEY=sk-...

	# Azure OpenAI (when AI_PROVIDER=azure)
	AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
	AZURE_OPENAI_KEY=...
	AZURE_OPENAI_DEPLOYMENT=<deployment-name>
	AZURE_OPENAI_API_VERSION=2024-04-01-preview

	# Ollama (when AI_PROVIDER=olama)
	OLAMA_BASE_URL=http://127.0.0.1:11434
	OLAMA_MODEL=llama2

	# Optional: PostgreSQL (fallback if Mongo not set)
	DATABASE_URL=postgres://user:password@localhost:5432/sow_gen
	```

	Notes
	- If both `MONGODB_URI` and `DATABASE_URL` are unset/unavailable, an in‑memory store is used (dev only).
	- Auth uses the configured store (Mongo preferred). On first run, an admin may be auto‑created (see `server/auth.ts`).

	## Install and run (development)

	```powershell
	# From repo root
	npm install

	# Start backend + Vite dev server
	npm run dev
	```

	- Backend listens on `PORT` (default 3000).
	- Vite dev server proxies `/api` to the backend.

	## Build and run (production)

	```powershell
	# Build client and bundle server
	npm run build

	# Start built server
	$env:NODE_ENV="production"; node dist/index.js
	```

	## Key endpoints (server)

	- SOWs: `GET/POST /api/sows`, `GET/PATCH/DELETE /api/sows/:id`, `POST /api/sows/:id/copy`
	- Approvals & audit: `GET /api/sows/:id/approvals`, `PATCH /api/sow-approvals/:id`, `GET/POST /api/sows/:id/audit`, `POST /api/sows/:id/reassign`, `POST /api/sows/:id/revert`
	- Templates & workflows: `GET/POST /api/templates`, `GET /api/templates/:id`, `GET/POST /api/workflows`, `GET /api/workflows/:id`
	- Export: `POST /api/sows/:id/export` `{ format: "pdf" | "word", header?: string, footer?: string }`
	- Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/change-password`

	## PDF/Word export behavior

	- Word (.docx): semantic headings and tables using `docx`
	- PDF: generated with `pdfkit`
		- Repeats header and footer on every page
		- Paginates tables and repeats the header row when a table spans pages
		- After tables, content starts at a sensible position (no large gaps)

	## Troubleshooting

	- MongoDB connection refused: verify the service and `MONGODB_URI` (use `127.0.0.1` on Windows to avoid IPv6 issues)
	- AI errors: confirm `AI_PROVIDER` and the corresponding credentials (Azure/OpenAI/Ollama)
	- Dev server errors: check Node 18+, delete `node_modules` and reinstall if needed
	- CSS issues in editor during type checking are surfaced by tooling, but do not block server start
