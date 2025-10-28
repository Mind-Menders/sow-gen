# SOW Generator - Enterprise Edition

## Overview
An enterprise-grade Statement of Work (SOW) generator application with template management, multi-step creation workflow, document editor with AI-powered content generation, and approval tracking. Built with React, TypeScript, Express, MongoDB, and OpenAI integration.

## Project Architecture

### Frontend (React + TypeScript + Tailwind CSS)
- **Dashboard**: Statistics overview and SOW list with filtering
- **Create SOW Wizard**: 4-step creation process (Type → Details → Template → Workflow)
- **Document Editor**: Sectioned content editing with AI assistant panel
- **Template Library**: Reusable SOW templates
- **Sidebar Navigation**: Main menu with user profile

### Backend (Express + MongoDB)
- **SOW CRUD API**: Create, read, update, delete SOWs
- **Template API**: Template management
- **AI Content Generation**: OpenAI GPT-5 integration for generating section content
- **SOW Number Generation**: Auto-generated unique identifiers
- **MongoDB Storage**: Persistent data storage with automatic initialization
- **Sample Data**: Pre-populated templates and SOWs

### Design System
- **Colors**: Enterprise blue/purple gradient theme (primary: `hsl(250 90% 60%)`)
- **Typography**: Inter for body text, JetBrains Mono for code/numbers
- **Components**: Shadcn UI with custom styling
- **Responsive**: Mobile-first design with breakpoints

## Key Features

### SOW Management
- Create SOWs with multi-step wizard
- Edit sectioned documents (Executive Summary, Scope, Requirements, etc.)
- Track status (Draft, Pending Approval, Approved, Rejected)
- Filter by status and type
- Export to text file

### Templates
- Pre-built official templates
- Template-based SOW creation
- Sectioned structure for consistency

### Document Editing
- 9 standard sections per SOW
- Real-time content editing with auto-save (2-second debounce)
- Section completion tracking
- Manual and automatic save functionality
- AI Assistant panel with GPT-5 powered content generation
  - Generate content suggestions based on SOW context
  - Insert or copy AI-generated content
  - Context-aware suggestions using project details

## Technical Details

### Data Models
- **SOW**: id, sowNumber, title, vendorName, sponsor, sowType, status, sections, timestamps
- **Template**: id, name, description, sowType, isOfficial, sections, createdAt
- **Section**: id, icon, title, content

### API Endpoints
- `GET /api/sows` - List all SOWs
- `GET /api/sows/:id` - Get specific SOW
- `POST /api/sows` - Create new SOW
- `PATCH /api/sows/:id` - Update SOW
- `DELETE /api/sows/:id` - Delete SOW
- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get specific template
- `POST /api/templates` - Create new template
- `POST /api/ai/generate-content` - Generate AI content for SOW sections

### Storage
Uses MongoDB for persistent data storage. Falls back to in-memory storage if MONGODB_URI is not configured. Automatically initializes with sample templates and SOWs on first run.

### AI Integration
Uses Replit AI Integrations (OpenAI-compatible API) with GPT-5 model for content generation:
- No API key required (uses Replit credits)
- Context-aware content generation
- Professional SOW writing expertise
- Can be replaced with Microsoft Azure AI if needed

## Recent Changes
- **2025-10-28 (Latest)**: MongoDB backend and AI integration
  - Migrated from in-memory storage to MongoDB
  - Integrated OpenAI GPT-5 for AI content generation
  - Added auto-save functionality with 2-second debounce
  - Implemented section-switching data protection
  - Added comprehensive error handling for save operations
  - Created AI Assistant panel with Insert/Copy functionality
  - All navigation links now working (Workflow/Profile pages have placeholder UIs)
  
- **2025-10-28**: Initial implementation with all core features
  - Implemented dashboard with statistics and filtering
  - Built 4-step SOW creation wizard
  - Created document editor with sectioned editing
  - Added template library
  - Set up sidebar navigation
  - Configured enterprise blue/purple theme
  - Added sample data (6 SOWs, 3 templates)
  - Fixed React Query key structure for proper data fetching
  - Replaced emoji icons with text badges
  - Updated status badges to use semantic variants

## User Preferences
- Professional enterprise aesthetic with blue/purple gradient
- Clean, card-based layouts
- Minimal use of colors, emphasis on typography and spacing
- Consistent spacing and padding throughout
- Responsive design for all screen sizes

## Running the Application
```bash
npm run dev
```
Application runs on port 5000 with both frontend (Vite) and backend (Express) served together.

## Navigation
- **Dashboard** (`/`) - Overview with statistics and SOW cards
- **New SOW Request** (`/createsow`) - 4-step creation wizard
- **Template Manager** (`/templates`) - Browse and manage templates
- **Workflow Manager** (`/workflows`) - Placeholder page for approval workflows
- **Profile Manager** (`/profilemanager`) - Placeholder page for user management
- **Editor** (`/editor?id={sowId}`) - Document editing with AI assistance

## Future Enhancements
- Complete Workflow Manager implementation with approval routing
- Complete Profile Manager with user roles and permissions
- Collaborative editing with real-time sync
- Version history and document comparison
- Full-text search across SOWs
- Azure AI integration option
- Advanced authentication and authorization
- Email notifications for approvals
- Document templates customization
