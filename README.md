# SOW-Gen (Statement of Work Generator)# sow-gen

SOW (Statement of Work) Generator

Full-stack enterprise SOW drafting, review, and export application. React + Vite frontend, Express + TypeScript backend, MongoDB primary storage (PostgreSQL and in-memory fallbacks supported). AI-powered features for content generation, quality analysis, chat assistance, and section recommendations.

This repository is a full-stack SOW generator app. It includes a React + Vite frontend and an Express + TypeScript backend. The project uses MongoDB for primary storage.

## Highlights

## Tech stack

- **Rich Text Editor** with smart table paste support (Quill + custom table blot)

- **Multi-Stage Workflows** with approvals, reassignment, revert, and comprehensive audit trail- Frontend

- **Professional Document Export**	# SOW-Gen (Statement of Work Generator)

  - **PDF**: Advanced pagination with repeated table headers, persistent page headers/footers, and intelligent table break handling

  - **Word (.docx)**: Semantic structure with headings, tables, and full-page border wrapping for professional appearance	Full‑stack app for drafting, reviewing, and exporting enterprise SOWs. React + Vite frontend, Express + TypeScript backend, MongoDB primary storage (PostgreSQL and in‑memory fallbacks supported). AI features assist with section authoring, analysis, inline suggestions, chat, and section recommendations.

- **AI-Powered Features** (pluggable provider architecture)

  - Content generation with context awareness	## Highlights

  - Section quality analysis (clarity, completeness, professionalism scores)

  - Real-time chat assistant for SOW guidance	- SOW editor with rich text and table paste support (Quill custom table blot)

  - Section recommendations and suggestions	- Workflows, approvals, reassignment, and audit trail

  - Bulk content generation for multiple sections	- Exports to PDF and Word (.docx)

- **Visual AI Highlighting** - Purple gradient badges and animations distinguish all AI-powered features		- PDF: proper table pagination, repeated table headers across pages, and a repeating header/footer on every page

- **Template System** - Pre-configured section templates for common SOW types		- Word: semantic tables and headings

- **Access Control** - Role-based permissions with configuration history	- AI features (pluggable provider)

		- Generate content for a section

## Tech Stack		- Analyze section quality (scores + issues/suggestions)

		- Inline writing suggestions

### Frontend		- Chat about the current SOW

- React 18 + TypeScript		- Suggest additional sections

- Vite (build tool with HMR)

- Tailwind CSS + Radix UI components	## Tech stack

- React Query (@tanstack/react-query) for state management

- Wouter for routing	- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Radix UI

- React Quill for rich text editing with custom table blot	- Backend: Node.js (ESM), Express, TypeScript

- Lucide Icons, Framer Motion for animations	- Storage: MongoDB (preferred), PostgreSQL (optional), in‑memory (dev fallback)

	- Auth: express-session, bcrypt; Mongo or Postgres-backed user store

### Backend	- Export: pdfkit (PDF), docx (Word)

- Node.js 18+ (ESM modules)	- AI Providers: OpenAI Integrations (default), Azure OpenAI SDK, or local Ollama

- Express.js + TypeScript

- tsx (development runtime)	## Project structure (top‑level)

- esbuild (production bundling)

	- `client/` — React app (Vite)

### Storage	- `server/` — Express API, auth, AI integration, export, storage

- MongoDB (primary/preferred) - Mongoose ODM	- `shared/` — shared schema and config

- PostgreSQL (optional fallback) - Drizzle ORM	- `scripts/` — small maintenance utilities

- In-memory store (development fallback)

- Session storage: connect-mongo (MongoDB) or connect-pg-simple (PostgreSQL)	## Features



### Authentication & Security	### Editor and content

- express-session for session management	- Rich text editor with headings/lists/code and embedded tables

- bcrypt for password hashing	- Smart table paste: preserves HTML structure using a custom Quill blot

- Role-based access control	- Auto‑save with debounce, per‑section editing, re‑ordering, add/rename/delete sections



### Document Generation	### Workflows and approvals

- pdfkit for PDF export (with custom pagination logic)	- Multi‑stage workflows with reviewers per stage

- docx library for Word export (semantic structure)	- Approve/mark reviewed, reassign reviewer, revert stage with remarks

	- Audit trail records actions (status changes, reviewer changes, edits)

### AI Providers (Pluggable)

- OpenAI API (default - GPT-4o/GPT-4)	### Exports

- Azure OpenAI Service (enterprise)	- PDF and Word exports from the SOW editor

- Ollama (local/offline LLMs)	- Header and footer text fields in the export dialog

	- PDF export details

### Email		- Repeating document header and footer on every page

- Nodemailer for workflow notifications		- Tables paginate correctly; header row is repeated on page breaks

		- Avoids mid‑page large gaps after long tables

## Project Structure

	### AI assistance

```	- Generate section content: `/api/ai/generate-content`

sow-gen/	- Analyze section quality: `/api/ai/analyze-section`

├── client/                 # React frontend	- Inline suggestion while typing: `/api/ai/inline-suggestion`

│   ├── src/	- Chat about the SOW: `/api/ai/chat`

│   │   ├── components/     # Reusable UI components	- Suggest additional sections: `/api/ai/suggest-sections`

│   │   │   ├── ui/         # Radix UI components

│   │   │   ├── ai-badge.tsx	Provider selection via `AI_PROVIDER`:

│   │   │   ├── ai-analysis-panel.tsx	- `integrations` (default): existing OpenAI integrations client

│   │   │   ├── ai-chat-assistant.tsx	- `azure`: official Azure OpenAI SDK

│   │   │   └── app-sidebar.tsx	- `olama`: local Ollama server (offline)

│   │   ├── pages/          # Route pages

│   │   │   ├── dashboard.tsx	## Prerequisites

│   │   │   ├── editor.tsx

│   │   │   ├── templates.tsx	- Node.js 18+ and npm

│   │   │   ├── workflows.tsx	- Git

│   │   │   └── ai-dashboard.tsx	- MongoDB Community Server (recommended) or PostgreSQL (optional)

│   │   ├── hooks/          # Custom React hooks

│   │   ├── lib/            # Utilities	Windows: install MongoDB Community Server from https://www.mongodb.com/try/download/community and run it as a service.

│   │   └── main.tsx

│   ├── index.html	## Environment configuration

│   └── public/

├── server/                 # Express backend	Create a `.env` in repo root. Minimum:

│   ├── index.ts            # Server entry point

│   ├── routes.ts           # API endpoints	```ini

│   ├── auth.ts             # Authentication logic	# Core server

│   ├── storage.ts          # Storage abstraction	PORT=3000

│   ├── mongo-storage.ts    # MongoDB implementation	NODE_ENV=development

│   ├── postgres-storage.ts # PostgreSQL implementation	SESSION_SECRET=your_session_secret_here

│   ├── openai.ts           # AI provider abstraction

│   ├── export.ts           # PDF/Word generation	# Storage (prefer MongoDB)

│   ├── ai-bulk-section.ts  # Bulk AI operations	MONGODB_URI=mongodb://127.0.0.1:27017/sow_gen

│   ├── email-service.ts    # Email notifications

│   ├── access-control.ts   # RBAC implementation	# AI provider selection

│   └── types/	AI_PROVIDER=integrations  # integrations | azure | olama

├── shared/                 # Shared TypeScript schemas

│   ├── schema.ts           # Zod schemas	# OpenAI integrations (default provider)

│   └── status-config.ts	AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

├── scripts/                # Utility scripts	AI_INTEGRATIONS_OPENAI_API_KEY=sk-...

│   ├── list-users.js

│   ├── inspect-user.js	# Azure OpenAI (when AI_PROVIDER=azure)

│   └── update-sow-status.js	AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com

├── package.json	AZURE_OPENAI_KEY=...

├── tsconfig.json	AZURE_OPENAI_DEPLOYMENT=<deployment-name>

├── vite.config.ts	AZURE_OPENAI_API_VERSION=2024-04-01-preview

├── tailwind.config.ts

└── drizzle.config.ts	# Ollama (when AI_PROVIDER=olama)

```	OLAMA_BASE_URL=http://127.0.0.1:11434

	OLAMA_MODEL=llama2

## Features

	# Optional: PostgreSQL (fallback if Mongo not set)

### Editor and Content Management	DATABASE_URL=postgres://user:password@localhost:5432/sow_gen

- Rich text editing with headings, lists, code blocks, and formatting	```

- **Smart table paste**: Preserves HTML table structure using custom Quill blot

- Auto-save with 2-second debounce	Notes

- Per-section editing with expand/collapse	- If both `MONGODB_URI` and `DATABASE_URL` are unset/unavailable, an in‑memory store is used (dev only).

- Section reordering via drag-and-drop	- Auth uses the configured store (Mongo preferred). On first run, an admin may be auto‑created (see `server/auth.ts`).

- Add, rename, delete, and duplicate sections

- Copy existing SOWs as templates	## Install and run (development)



### Workflows and Approvals	```powershell

- Multi-stage workflow configuration (e.g., Draft → Review → Final)	# From repo root

- Assign reviewers per workflow stage	npm install

- Approve/mark sections as reviewed

- Reassign reviewers dynamically	# Start backend + Vite dev server

- Revert to previous stage with remarks	npm run dev

- Comprehensive audit trail (status changes, reviewer changes, edits)	```



### Document Export	- Backend listens on `PORT` (default 3000).

- **PDF Export** (`/api/sows/:id/export` with `format: "pdf"`)	- Vite dev server proxies `/api` to the backend.

  - Repeating document header and footer on every page

  - Intelligent table pagination with repeated header rows	## Build and run (production)

  - Avoids mid-page gaps after long tables

  - Configurable header/footer text via export dialog	```powershell

  	# Build client and bundle server

- **Word Export** (`/api/sows/:id/export` with `format: "word"`)	npm run build

  - Semantic document structure with proper headings

  - Native Word tables with borders	# Start built server

  - Full-page border wrapping for professional appearance	$env:NODE_ENV="production"; node dist/index.js

  - 100% page width with fixed layout to prevent overflow	```

  - Proper spacing and indentation

	## Run with Docker

### AI-Powered Assistance

	You can run the app fully in Docker. The container serves both API and the built client at http://localhost:5000.

All AI features are visually highlighted with purple gradient badges (✨) and animations.

	Prerequisites:

**Available AI Features:**	- Docker and Docker Compose installed



1. **Content Generation** (`/api/ai/generate-content`)	1) Copy the environment file and adjust values as needed

   - Generate professional content for any section

   - Context-aware based on SOW title, vendor, type, and requirements	```powershell

   - Bulk generation for multiple sections simultaneously	copy .env.example .env

	```

2. **Section Quality Analysis** (`/api/ai/analyze-section`)

   - Real-time quality scoring (0-100%)	Recommended local `.env` settings:

   - Detailed metrics: clarity, completeness, professionalism	- `PORT=5000` (matches exposed port)

   - Issue detection (unclear statements, redundancy, compliance concerns)	- `NODE_ENV=production` (enables static serving)

   - Missing information alerts	- `SESSION_SECURE=false` (so cookies work over HTTP locally)

   - Actionable improvement suggestions	- When using Compose: `MONGODB_URI=mongodb://mongo:27017/sow_gen`

   - Results cached for 1 minute to optimize API usage

	2) Start with Docker Compose

3. **AI Chat Assistant** (`/api/ai/chat`)

   - Conversational interface for SOW guidance	```powershell

   - Context-aware of current SOW	docker compose up --build

   - Maintains conversation history (last 6 messages)	```

   - Floating chat bubble in bottom-right corner

   - Ask questions like:	Then open http://localhost:5000

     - "What's missing from my scope section?"

     - "Make the deliverables section more formal"	Notes:

     - "What are the main risks in this SOW?"	- The app container builds the client into `dist/public` and serves it via Express.

	- MongoDB runs as a separate service. Data is persisted to the `mongo-data` volume.

4. **Section Recommendations** (`/api/ai/suggest-sections`)	- In production behind HTTPS, set `SESSION_SECURE=true` to secure session cookies.

   - Suggests additional sections based on SOW context

   - Helps ensure completeness	## Key endpoints (server)



5. **AI Analytics Dashboard** (`/api/metrics/insights`)	- SOWs: `GET/POST /api/sows`, `GET/PATCH/DELETE /api/sows/:id`, `POST /api/sows/:id/copy`

   - Performance metrics visualization	- Approvals & audit: `GET /api/sows/:id/approvals`, `PATCH /api/sow-approvals/:id`, `GET/POST /api/sows/:id/audit`, `POST /api/sows/:id/reassign`, `POST /api/sows/:id/revert`

   - SOW completion trends and cycle time analysis	- Templates & workflows: `GET/POST /api/templates`, `GET /api/templates/:id`, `GET/POST /api/workflows`, `GET /api/workflows/:id`

   - AI-generated insights and recommendations	- Export: `POST /api/sows/:id/export` `{ format: "pdf" | "word", header?: string, footer?: string }`

	- Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/change-password`

**AI Provider Configuration:**

	## PDF/Word export behavior

Set via `AI_PROVIDER` environment variable:

	- Word (.docx): semantic headings and tables using `docx`

- `integrations` (default): OpenAI API	- PDF: generated with `pdfkit`

- `azure`: Azure OpenAI Service		- Repeats header and footer on every page

- `ollama`: Local Ollama server (offline)		- Paginates tables and repeats the header row when a table spans pages

		- After tables, content starts at a sensible position (no large gaps)

### Templates and Workflows

- Pre-configured templates for common SOW types	## Troubleshooting

- Create custom templates from existing SOWs

- Define multi-stage workflows with custom stages	- MongoDB connection refused: verify the service and `MONGODB_URI` (use `127.0.0.1` on Windows to avoid IPv6 issues)

- Assign default reviewers per workflow stage	- AI errors: confirm `AI_PROVIDER` and the corresponding credentials (Azure/OpenAI/Ollama)

	- Dev server errors: check Node 18+, delete `node_modules` and reinstall if needed

### Access Control	- CSS issues in editor during type checking are surfaced by tooling, but do not block server start

- Role-based permissions (admin, manager, user)
- Configuration management with history tracking
- User profile management
- Password change functionality

## Prerequisites

- Node.js 18+ and npm
- Git
- **MongoDB Community Server** (recommended) or **PostgreSQL** (optional)

**Windows MongoDB Installation:**
1. Download from https://www.mongodb.com/try/download/community
2. Install and run as a Windows service
3. Default connection: `mongodb://127.0.0.1:27017/sow_gen`

## Environment Configuration

Create a `.env` file in the repository root:

```ini
# Core Server Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_random_session_secret_here
SESSION_SECURE=false  # Set to true in production with HTTPS

# Primary Storage (MongoDB - Recommended)
MONGODB_URI=mongodb://127.0.0.1:27017/sow_gen

# Optional: PostgreSQL (Fallback if MongoDB unavailable)
DATABASE_URL=postgres://user:password@localhost:5432/sow_gen

# AI Provider Selection
AI_PROVIDER=integrations  # Options: integrations | azure | ollama

# OpenAI Integration (when AI_PROVIDER=integrations)
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-api-key-here
AI_INTEGRATIONS_MODEL=gpt-4o

# Azure OpenAI (when AI_PROVIDER=azure)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-azure-api-key
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-04-01-preview

# Ollama (when AI_PROVIDER=ollama) - Local/Offline
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama2

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

**Notes:**
- If both `MONGODB_URI` and `DATABASE_URL` are unset or unavailable, an in-memory store is used (development only, non-persistent)
- On first run with an empty database, a default admin user may be auto-created (check `server/auth.ts`)
- Use `127.0.0.1` instead of `localhost` for MongoDB on Windows to avoid IPv6 issues

## Installation and Development

```powershell
# From repository root
npm install

# Start backend + Vite dev server
npm run dev
```

- Backend listens on `PORT` (default: 3000)
- Vite dev server runs with HMR and proxies `/api` requests to backend
- Access app at http://localhost:3000

## Production Build and Deployment

```powershell
# Build client and bundle server
npm run build

# Start production server
$env:NODE_ENV="production"
node dist/index.js
```

The build process:
1. Builds React client into `dist/public`
2. Bundles Express server with esbuild into `dist/index.js`
3. Server serves static files in production mode

## Docker Deployment

Run the entire application stack with Docker Compose.

**Prerequisites:**
- Docker
- Docker Compose

**Steps:**

1. **Create/update `.env` file:**

```ini
# Docker-specific settings
PORT=5000
NODE_ENV=production
SESSION_SECRET=your_random_session_secret
SESSION_SECURE=false  # true if behind HTTPS proxy

# MongoDB (use service name from docker-compose.yml)
MONGODB_URI=mongodb://mongo:27017/sow_gen

# AI Provider (as above)
AI_PROVIDER=integrations
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key
```

2. **Start services:**

```powershell
docker compose up --build
```

3. **Access application:**
   - Open http://localhost:5000

**Docker Architecture:**
- **App Container**: Builds and serves React app + Express API
- **MongoDB Container**: Persistent data storage
- **mongo-data Volume**: Preserves database across container restarts

**Production Notes:**
- In production behind HTTPS, set `SESSION_SECURE=true` for secure cookies
- Configure MongoDB authentication for production deployments
- Use environment-specific `.env` files

## API Endpoints

### SOW Management
- `GET /api/sows` - List all SOWs
- `POST /api/sows` - Create new SOW
- `GET /api/sows/:id` - Get SOW details
- `PATCH /api/sows/:id` - Update SOW
- `DELETE /api/sows/:id` - Delete SOW
- `POST /api/sows/:id/copy` - Duplicate SOW

### Approvals and Audit
- `GET /api/sows/:id/approvals` - Get approval status
- `PATCH /api/sow-approvals/:id` - Update approval status
- `GET /api/sows/:id/audit` - Get audit trail
- `POST /api/sows/:id/audit` - Add audit entry
- `POST /api/sows/:id/reassign` - Reassign reviewer
- `POST /api/sows/:id/revert` - Revert to previous stage

### Templates and Workflows
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow

### Document Export
- `POST /api/sows/:id/export` - Export SOW
  ```json
  {
    "format": "pdf" | "word",
    "header": "Optional header text",
    "footer": "Optional footer text"
  }
  ```

### AI Features
- `POST /api/ai/generate-content` - Generate section content
- `POST /api/ai/analyze-section` - Analyze section quality
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/suggest-sections` - Get section recommendations
- `POST /api/ai/generate-bulk` - Bulk generate multiple sections

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password

### Access Control
- `GET /api/access-control` - Get RBAC configuration
- `POST /api/access-control` - Update RBAC configuration
- `GET /api/access-control/history` - Get configuration history

### Analytics
- `GET /api/metrics/sow` - Get SOW metrics and statistics
- `POST /api/metrics/insights` - Generate AI-powered insights

## Troubleshooting

### MongoDB Connection Issues
- **Error**: `MongoNetworkError` or connection refused
- **Solution**: 
  - Verify MongoDB service is running: `net start MongoDB` (Windows)
  - Use `127.0.0.1` instead of `localhost` in `MONGODB_URI`
  - Check firewall settings

### AI Provider Errors
- **Error**: AI features not working
- **Solution**:
  - Verify `AI_PROVIDER` is set correctly
  - Check API keys are valid and have credits
  - For Ollama: ensure server is running (`ollama serve`)
  - Check server logs for `[AI]` prefix messages

### Development Server Issues
- **Error**: Port already in use
- **Solution**: Change `PORT` in `.env` or kill existing process

- **Error**: Module not found
- **Solution**: Delete `node_modules` and `package-lock.json`, run `npm install`

### Export Problems
- **PDF exports fail**: Check `pdfkit` installation
- **Word exports fail**: Check `docx` library version (should be 9.5.1+)
- **Content overflow in Word**: Fixed with table-based border wrapping

### Docker Issues
- **Container fails to start**: Check `.env` configuration
- **MongoDB connection fails**: Ensure `MONGODB_URI=mongodb://mongo:27017/sow_gen` (using service name)
- **Port conflict**: Change `PORT` in `.env` and `docker-compose.yml`

## Additional Documentation

- **AI Features**: See `AI_FEATURES.md` for detailed AI functionality documentation
- **App Info**: See `AppInfo.md` for comprehensive application details
- **Design Guidelines**: See `design_guidelines.md` for UI/UX patterns
- **Technical Architecture**: See `technical-architecture-diagram.drawio` for visual system design

## Development Notes

### Storage Abstraction
The application uses a storage abstraction layer (`IStorage` interface) that automatically selects the appropriate storage backend:

1. **MongoDB** (preferred if `MONGODB_URI` is set)
2. **PostgreSQL** (fallback if `DATABASE_URL` is set)
3. **In-Memory** (development fallback, non-persistent)

### Session Management
Sessions are stored in the active database backend:
- MongoDB: `connect-mongo` (collection: `sessions`)
- PostgreSQL: `connect-pg-simple` (table: `sessions`)
- In-Memory: `memorystore` (non-persistent)

### AI Provider Architecture
AI functionality is abstracted in `server/openai.ts`, allowing easy switching between providers without code changes. Each provider implements the same interface for content generation, analysis, and chat.

### RAG Retrieval & Embeddings
Implemented ChromaDB-based retrieval augmentation for context-aware AI generation:
- Chunking + embedding pipeline (`vector-storage.ts`) using OpenAI embeddings
- Storage/retrieval interface (`chromadb-client.ts`) feeds relevant chunks into bulk and per‑section generation (`ai-bulk-section.ts`)
- Enables higher quality, document-grounded suggestions and content drafts
(Internal note: persistence/query layer is evolving; interface already wired into generation flow.)

### Future Enhancements
- Advanced document parsing for uploaded reference materials
- Multi-language support for international SOWs
- Real-time collaborative editing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

## License

MIT License - see LICENSE file for details

---

**Built with ❤️ and ✨ AI assistance**
