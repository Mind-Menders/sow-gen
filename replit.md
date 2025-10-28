# SOW Generator - Enterprise Edition

## Overview
An enterprise-grade Statement of Work (SOW) generator application with template management, multi-step creation workflow, document editor, and approval tracking. Built with React, TypeScript, Express, and in-memory storage.

## Project Architecture

### Frontend (React + TypeScript + Tailwind CSS)
- **Dashboard**: Statistics overview and SOW list with filtering
- **Create SOW Wizard**: 4-step creation process (Type → Details → Template → Workflow)
- **Document Editor**: Sectioned content editing with AI assistant panel
- **Template Library**: Reusable SOW templates
- **Sidebar Navigation**: Main menu with user profile

### Backend (Express + In-Memory Storage)
- **SOW CRUD API**: Create, read, update, delete SOWs
- **Template API**: Template management
- **SOW Number Generation**: Auto-generated unique identifiers
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
- Real-time content editing
- Section completion tracking
- Save functionality
- AI Assistant panel (UI only for MVP)

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

### Storage
Uses in-memory storage (MemStorage) with sample data initialization. Data persists during server runtime but resets on restart.

## Recent Changes
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

## Future Enhancements
- Real AI integration for content generation
- Workflow approval system with notifications
- Collaborative editing
- Version history and document comparison
- Full-text search across SOWs
- PostgreSQL persistence
- User authentication and authorization
