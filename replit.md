# SOW Generator - Enterprise Edition

## Overview
An enterprise-grade Statement of Work (SOW) generator application with template management, multi-step creation workflow, document editor with AI-powered content generation, workflow approval system, and user management. Built with React, TypeScript, Express, PostgreSQL (Neon), and OpenAI integration.

## Project Architecture

### Frontend (React + TypeScript + Tailwind CSS)
- **Dashboard**: Statistics overview and SOW list with filtering
- **Create SOW Wizard**: 4-step creation process (Type → Details → Template → Workflow)
- **Document Editor**: Sectioned content editing with AI assistant panel
- **Template Library**: Reusable SOW templates
- **Sidebar Navigation**: Main menu with user profile

### Backend (Express + PostgreSQL)
- **SOW CRUD API**: Create, read, update, delete SOWs with workflow linkage
- **Template API**: Template management
- **User Management API**: User CRUD with roles and departments
- **Workflow Management API**: Workflow CRUD with multi-stage approval configuration
- **Approval Tracking API**: SOW approval status tracking with workflow stages
- **AI Content Generation**: OpenAI GPT-4o integration for generating section content
- **SOW Number Generation**: Auto-generated unique identifiers
- **PostgreSQL Storage**: Persistent data storage via Drizzle ORM with Neon database
- **Sample Data**: Pre-populated templates, SOWs, users, and workflows

### Design System
- **Colors**: Red/white/black theme (primary: `hsl(0 100% 50%)`)
- **Typography**: Inter for body text, JetBrains Mono for code/numbers
- **Components**: Shadcn UI with custom styling
- **Responsive**: Mobile-first design with breakpoints
- **Sidebar Navigation**: Enhanced with colorful icons and red active state highlighting

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
- AI Assistant panel with GPT-4o powered content generation
  - Generate content suggestions based on SOW context
  - Insert or copy AI-generated content
  - Context-aware suggestions using project details

### Workflow & Approval System
- Create and manage multi-stage approval workflows
- Assign SOW types to workflows (RFT, Enhancement, Flexi Sourcing, etc.)
- Configure approval stages with multiple reviewers per stage
- Require all or any reviewer approval per stage
- Workflow selection integrated into SOW creation wizard
- Automatic approval tracking when workflow assigned
- SOW status transitions (Draft → Pending Approval → Approved/Rejected)

### User Management
- Full user CRUD operations
- Role-based access (Admin, Manager, Reviewer, User)
- Department assignment for users
- Active/inactive user status tracking
- User selection for workflow reviewer assignments

## Technical Details

### Data Models
- **Session**: sid (PK), sess (JSON), expire (for Replit Auth session storage)
- **SOW**: id, sowNumber, title, initiative, deliveryPortfolio, vendorName, sponsor, businessOwner, startDate, endDate, budget, currency, sowType, status, workflowId, sections, timestamps
- **Template**: id, name, description, sowType, isOfficial, sections, createdAt
- **User**: id, name, email, firstName, lastName, profileImageUrl, role, department, isActive, createdAt, updatedAt
- **Workflow**: id, name, description, sowTypes (JSON), stages (JSON), isActive, timestamps
- **WorkflowStage**: id, name, reviewerIds (array), requireAll (boolean)
- **SowApproval**: id, sowId, workflowId, currentStage, reviewerId, status, comments, timestamps
- **Section**: id, icon, title, content

### API Endpoints
- **Authentication**
  - `GET /api/login` - Initiate Replit Auth login flow
  - `GET /api/logout` - Log out and end session
  - `GET /api/callback` - OAuth callback endpoint
  - `GET /api/auth/user` - Get current authenticated user
- **SOWs**
  - `GET /api/sows` - List all SOWs
  - `GET /api/sows/:id` - Get specific SOW
  - `POST /api/sows` - Create new SOW
  - `PATCH /api/sows/:id` - Update SOW
  - `DELETE /api/sows/:id` - Delete SOW
- **Templates**
  - `GET /api/templates` - List all templates
  - `GET /api/templates/:id` - Get specific template
  - `POST /api/templates` - Create new template
- **AI**
  - `POST /api/ai/generate-content` - Generate AI content for SOW sections
- **Users**
  - `GET /api/users` - List all users
  - `GET /api/users/:id` - Get specific user
  - `POST /api/users` - Create new user
  - `PATCH /api/users/:id` - Update user
  - `DELETE /api/users/:id` - Delete user
- **Workflows**
  - `GET /api/workflows` - List all workflows
  - `GET /api/workflows/:id` - Get specific workflow
  - `POST /api/workflows` - Create new workflow
  - `PATCH /api/workflows/:id` - Update workflow
  - `DELETE /api/workflows/:id` - Delete workflow

### Storage
Uses PostgreSQL for persistent data storage via Drizzle ORM. Falls back to in-memory storage if DATABASE_URL is not configured. Automatically initializes with sample templates, SOWs, users, and workflows on first run.

### AI Integration
Uses Replit AI Integrations (OpenAI-compatible API) with GPT-4o model for content generation:
- No API key required (uses Replit credits)
- Context-aware content generation
- Professional SOW writing expertise
- Can be replaced with Microsoft Azure AI if needed

## Recent Changes
- **2025-10-28 (Latest)**: Header Bar Removal and Sidebar Collapse Enhancement
  - **Removed header bar** completely from authenticated app
  - Main content now starts at the very top (no header gap)
  - Added **SidebarRail** component for sidebar collapse via clickable edge
  - Sidebar remains collapsible via keyboard shortcut (Ctrl+B / Cmd+B)
  - Fixed app structure: sidebar only renders when user is authenticated
  - Landing page now full-width without sidebar
  - Fixed QueryClient provider hierarchy to prevent runtime errors
  - End-to-end tested and confirmed working

- **2025-10-28**: Sidebar Navigation Enhancement
  - Added custom FileSignature icon for SOW Generator app name in red gradient box
  - Increased menu item size (h-12 height, text-base font)
  - Added colorful icons to each menu item (blue, green, purple, orange, pink)
  - Implemented red active state highlighting with:
    - 4px red left border (border-l-primary)
    - Light red background tint (bg-primary/10)
    - Red text and icon color for active items
    - Semibold font weight for active items
  - Increased spacing between menu items for better readability
  - End-to-end tested and confirmed working

- **2025-10-28**: Color Theme Update to Red/White/Black
  - Updated entire color palette from blue/purple to red/white/black
  - Light mode: white background, black text, red primary
  - Dark mode: black background, white text, red primary
  - Updated all color variables in index.css for consistency
  - Applied theme across all pages and components

- **2025-10-28**: Enhanced Project Details Capture
  - Expanded SOW schema with comprehensive project detail fields
  - Added initiative (required), deliveryPortfolio, businessOwner fields
  - Added startDate, endDate for project timeline tracking
  - Added budget (decimal support) and currency (default USD) fields
  - Updated Create SOW wizard step 2 with two-column responsive layout
  - All fields properly validated and persisted to PostgreSQL
  - End-to-end tested and confirmed working

- **2025-10-28**: User Authentication with Replit Auth and Vibrant UI Enhancements
  - Implemented complete Replit Auth integration for user authentication
    - Added sessions table for session storage
    - Updated users table with firstName, lastName, profileImageUrl, updatedAt for auth
    - Created useAuth hook for frontend authentication state
    - Implemented OpenID Connect authentication flow with Replit
    - Added /api/login, /api/logout, /api/callback, /api/auth/user endpoints
    - Created Landing page for logged-out users with features overview
    - Updated App.tsx to handle auth flow (Landing when logged out, main app when logged in)
    - Fixed critical storage issue: auth now uses same storage instance (PostgresStorage)
  - Added vibrant backgrounds with gradient overlays to Dashboard, Workflows, and Profile Manager
  - Icons already present on buttons and key UI elements throughout application
  
- **2025-10-28**: Complete Workflow Manager, Profile Manager, and approval system
  - Built complete Workflow Manager page with multi-stage approval configuration UI
  - Implemented full user management in Profile Manager (CRUD operations, roles, departments)
  - Integrated workflow selection into SOW creation wizard step 4
  - Added workflowId field to SOWs table and created approval tracking system
  - Implemented automatic sowApprovals record creation when workflow assigned
  - Set SOW status to "pending_approval" when workflow selected
  - Added API endpoints for users and workflows (/api/users, /api/workflows)
  - Seeded database with 4 sample users and 2 sample workflows
  
- **2025-10-28**: PostgreSQL migration and AI integration
  - Migrated from MongoDB to PostgreSQL (Neon) using Drizzle ORM
  - Integrated OpenAI GPT-4o for AI content generation
  - Added auto-save functionality with 2-second debounce
  - Implemented section-switching data protection
  - Added comprehensive error handling for save operations
  - Created AI Assistant panel with Insert/Copy functionality
  
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
- Professional enterprise aesthetic with red/white/black color scheme
- Clean, card-based layouts
- Colorful, vibrant icons for visual distinction
- Emphasis on typography and spacing
- Consistent spacing and padding throughout
- Responsive design for all screen sizes
- Red highlights for active/selected states

## Running the Application
```bash
npm run dev
```
Application runs on port 5000 with both frontend (Vite) and backend (Express) served together.

## Navigation
- **Dashboard** (`/`) - Overview with statistics and SOW cards
- **New SOW Request** (`/createsow`) - 4-step creation wizard
- **Template Manager** (`/templates`) - Browse and manage templates
- **Workflow Manager** (`/workflows`) - Manage approval workflows with multi-stage configuration
- **Profile Manager** (`/profilemanager`) - User management with roles and permissions
- **Editor** (`/editor?id={sowId}`) - Document editing with AI assistance

## Future Enhancements
- Approval status UI on SOW cards showing current stage and reviewers
- Approval progression interface for reviewers to approve/reject stages
- Collaborative editing with real-time sync
- Version history and document comparison
- Full-text search across SOWs
- Azure AI integration option
- Advanced authentication and authorization
- Email notifications for approvals
- Document templates customization
