# SOW Generator Application - Design Guidelines

## Design Approach

**Selected Approach:** Design System - Material Design + Linear Influences

**Justification:** This is an enterprise productivity tool focused on document management, workflow efficiency, and data-intensive operations. The application prioritizes usability, scanability, and professional aesthetics over visual marketing appeal. Material Design provides excellent patterns for data-rich interfaces, while Linear's clean approach ensures modern enterprise appeal.

**Key Design Principles:**
- Clarity and efficiency in information hierarchy
- Consistent, predictable interaction patterns
- Professional enterprise aesthetic
- Scannable content organization
- Minimal cognitive load through clear visual structure

## Typography System

**Font Families:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for SOW numbers, IDs)

**Hierarchy:**
- Page Headers: text-3xl font-bold (Dashboard, Template Library)
- Section Headers: text-2xl font-semibold
- Card Titles: text-lg font-semibold
- Subsection Headers: text-base font-semibold
- Body Text: text-sm font-normal
- Meta Information: text-xs font-medium (dates, sponsors, tags)
- SOW Numbers: text-sm font-mono font-medium

**Line Heights:**
- Headers: leading-tight
- Body: leading-relaxed
- Dense data: leading-normal

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, and 16 for consistent rhythm
- Component internal padding: p-4, p-6
- Card padding: p-6
- Section spacing: space-y-6, space-y-8
- Grid gaps: gap-4, gap-6
- Button padding: px-4 py-2, px-6 py-3

**Grid Systems:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Statistics cards: grid-cols-2 md:grid-cols-4 gap-4
- Template cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

**Container Widths:**
- Side navigation: w-64 fixed
- Main content area: ml-64 with max-w-7xl mx-auto
- Form containers: max-w-4xl
- Editor content: max-w-5xl

## Component Library

### Navigation
**Side Navigation (Fixed Left):**
- Full-height sidebar with enterprise branding at top
- Menu items with icon + label (using Heroicons)
- Active state: subtle background treatment with accent indicator
- Hover states: background opacity change
- User profile section at bottom with avatar, name, role

**Top Header Bar:**
- Logo/Brand: "SOW Generator" with "Enterprise Edition" subtitle
- Breadcrumbs for deep navigation (Dashboard > Editor)
- User menu dropdown (top-right)

### Dashboard Components

**Statistics Cards (Top Row):**
- Four cards: Total SOWs, Draft, Pending Approval, Approved
- Large number display: text-4xl font-bold
- Label below: text-sm font-medium
- Icon top-right corner
- Subtle border treatment

**SOW List Cards:**
- Card layout with: Status badge (top-left), SOW title, SOW number (monospace), Vendor name, Sponsor info, Date, Type tag
- Status badge: pill shape, text-xs font-semibold uppercase
- Action button (bottom-right): "Open" button
- Hover: subtle elevation/shadow increase
- Border treatment with status-based accent

**Filtering Controls:**
- Dropdown selects for Status and Type filters
- "New SOW" primary action button (prominent placement)

### Multi-Step Wizard

**Progress Indicator:**
- Horizontal stepper showing 4 steps
- Step circles with numbers
- Completed: filled with checkmark
- Current: outlined with emphasis
- Upcoming: muted outline
- Connecting lines between steps

**Step Content Cards:**
- Large content area with step title and description
- For selection steps (SOW Type): grid of option cards
- Option cards: icon/visual at top, title, description, radio button selection
- Card hover: border accent + subtle background
- Selected state: border emphasis + checkmark indicator

**Navigation:**
- "Back" and "Next" buttons at bottom
- "Next" button: primary emphasis
- "Back" button: secondary/ghost style

### Document Editor

**Editor Layout:**
- Three-column: Sidebar (sections nav), Main editor (content), AI Assistant panel (collapsible right)
- Sections sidebar: list of document sections with completion indicators (9/9)
- Main editor: rich text editing area with formatting toolbar
- Toolbar: sticky top, text formatting controls (bold, italic, lists, headings)

**Section Cards in Editor:**
- Each section in its own card container
- Section title with edit icon
- Collapsible sections
- Visual separator between sections

**AI Assistant Panel:**
- Slide-in from right
- Suggestions list with clickable items
- Insert/apply actions for suggestions

### Template Library

**Template Grid:**
- Cards with template preview area
- Template name + description
- Tags for template type
- "Preview" and "Use Template" actions
- Badge for "official" templates
- Hover: shadow/elevation increase

### Form Elements

**Input Fields:**
- Labels: text-sm font-medium mb-2
- Inputs: border, rounded-md, px-4 py-2
- Focus state: border accent + ring
- Disabled state: reduced opacity + no interaction

**Dropdowns/Selects:**
- Custom styled select with chevron icon
- Dropdown menu with hover states on options
- Search capability for long lists

**Buttons:**
- Primary: solid, font-semibold, px-6 py-3, rounded-md
- Secondary: outline, font-medium
- Ghost/Text: no background, hover background
- Icon buttons: p-2, square/rounded
- All buttons: smooth hover transitions, active press state

**Badges/Tags:**
- Pill shape: px-3 py-1, text-xs, rounded-full, font-semibold
- Status badges: different treatments per status
- Type tags: subtle background, uppercase

### Data Display

**Metadata Rows:**
- Label-value pairs in flex layout
- Icons next to labels (Heroicons)
- Consistent spacing: gap-2 between icon and text

**Tables (if needed):**
- Striped rows for readability
- Hover highlight on rows
- Sortable column headers with icons
- Sticky header on scroll

## Interaction Patterns

**Loading States:**
- Skeleton screens for card grids
- Spinner for form submissions
- Progress indicators for multi-step processes

**Empty States:**
- Centered icon + message + action button
- Used when no SOWs exist, no templates, etc.

**Modals/Dialogs:**
- Overlay backdrop with reduced opacity
- Centered modal card with max-w-2xl
- Header with title + close button
- Content area with padding
- Footer with action buttons

**Toasts/Notifications:**
- Top-right corner positioning
- Success, error, warning variants
- Auto-dismiss after 5 seconds
- Close button

## Animations

**Minimal, Purposeful Only:**
- Card hover: subtle scale (scale-[1.01]) + shadow transition
- Button hover: slight opacity change
- Dropdown open/close: smooth height transition
- Modal appear: fade-in + slight scale
- Toast slide-in from right
- All transitions: duration-200 to duration-300

## Accessibility

- All interactive elements keyboard accessible
- Focus visible states with ring utilities
- ARIA labels on icon-only buttons
- Proper heading hierarchy
- Form labels associated with inputs
- Skip navigation link
- Color contrast meeting WCAG AA standards minimum

## Responsive Behavior

**Mobile (< 768px):**
- Side navigation collapses to hamburger menu
- Cards stack to single column
- Statistics row wraps to 2x2 grid
- Wizard steps show current step only with prev/next
- Editor becomes single column with toggle for AI panel

**Tablet (768px - 1024px):**
- Side navigation remains visible
- Cards in 2-column grid
- Statistics in 2x2 grid
- Full wizard stepper visible

**Desktop (> 1024px):**
- Full three-column editor layout
- Cards in 3-column grid
- Statistics in single row
- All navigation elements visible