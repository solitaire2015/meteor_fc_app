# Football Club Management System - Project Overview

## 🎯 Project Goal


The **Football Club Management System** is a comprehensive web application designed to digitize and streamline the management of a local football team. The system transforms manual Excel-based record keeping into a modern, automated platform that handles match management, player statistics, financial tracking, and team content. **As the app is primarily intended for players and administrators to use on their smartphones, all design and development must prioritize the mobile user experience.**

## 📋 Project Background

### Current Challenge
- **Manual Operations**: Weekly match data recorded in Excel spreadsheets
- **Limited Analytics**: Basic statistical analysis capabilities
- **Fragmented Communication**: Video sharing through cloud storage links
- **Time-Consuming**: Manual fee calculations and attendance tracking
- **No Self-Service**: Players cannot access their own statistics

### Target Users
- **~30 Active Players**: Weekly Saturday matches (11 vs 11 format)
- **Team Administrators**: Match organizers and managers
- **Guest Players**: Occasional participants without full accounts

## 🚀 Implementation Architecture

### Technology Stack
```
Frontend:  Next.js 14 + TypeScript + shadcn/ui + Tailwind CSS
Backend:   Next.js API Routes (Serverless Functions)
Database:  PostgreSQL (Supabase) + Prisma ORM
Storage:   AWS S3 + CloudFront CDN
Deployment: Vercel Platform
Validation: Zod Schemas for type safety
```

### Core Architecture
- **Serverless Full-Stack**: Next.js 14 with App Router pattern
- **Type-Safe Development**: TypeScript + Zod for runtime validation
- **Component-First Design**: shadcn/ui components with custom business logic
- **Real-Time Calculations**: No cached statistics, computed from live data
- **Responsive Design**: **A mobile-first approach is paramount, as the application is primarily targeted at users on their smartphones.** The interface is designed to be fully responsive for all users.

## 🏗️ System Features

### 1. User Management System
- **Ghost Account Creation**: Admin creates minimal player profiles (name only)
- **Account Claiming**: Players can register and claim existing profiles
- **Role-Based Access**: Admin, Registered Player, Guest permissions
- **Profile Management**: Personal information, statistics, avatars

### 2. Match Management
- **3×3 Attendance Grid**: Flexible participation tracking system
  - 3 sections × 3 time periods per match
  - Support for partial attendance (0, 0.5, 1.0 units)
  - Goalkeeper tracking (exempt from field fees)
- **Event Recording**: Goals, assists, cards, penalties with player attribution
- **Real-Time Financial Calculations**: Automatic fee computation
- **Match Creation**: Date, opponent, score, result tracking

### 3. Advanced Statistics System
- **Multi-Category Leaderboards**: Goals, assists, appearances, cards
- **Temporal Analytics**: Monthly and yearly breakdowns
- **Team Statistics**: Win/loss/draw records, goals for/against
- **Individual Career Tracking**: Cross-season statistical aggregation
- **Goalkeeper Metrics**: Clean sheets, save rates

### 4. Financial Management
- **Automated Fee Calculation**: Based on attendance and participation time
- **Late Fee Tracking**: Automatic 10 yuan late arrival charges
- **Payment Proxy System**: Players can pay for others
- **Revenue Analysis**: Cost vs income tracking with profit/loss
- **Financial Reporting**: Monthly and yearly summaries

### 5. Content & Communication
- **Comment System**: Match discussions with threaded replies
- **Image Support**: Avatar uploads and comment attachments
- **Video Management**: Match video uploads and streaming
- **Audit Logging**: Comprehensive change tracking

## 📊 Development Progress

### ✅ Completed (Phase 1)
- **Core Infrastructure**: Next.js + TypeScript + Supabase setup
- **Database Schema**: 8 comprehensive data models with relationships
- **API Layer**: Complete CRUD operations with Zod validation
- **Admin Interface**: User management and match creation
- **Attendance System**: 3×3 grid with goalkeeper support
- **Financial Calculator**: Real-time fee computation
- **Statistics Engine**: Real-time calculations from match events
- **Component Library**: shadcn/ui integration with custom components

### ✅ Completed (Phase 2.1 - Avatar System)
- **Avatar Upload System**: Complete file upload with drag-and-drop support
- **AWS S3 Integration**: Secure cloud storage with CloudFront CDN
- **Image Processing**: File validation, size limits, format restrictions
- **UI/UX Components**: Modern avatar upload component with glass-morphism design
- **CORS Configuration**: Proper cross-origin resource sharing for image delivery
- **Profile Enhancement**: Integrated avatar display in user profile management

### 🔄 Current Focus (Phase 2.2)
- Advanced statistics visualization
- Performance optimizations
- Mobile experience refinement
- Enhanced user interface improvements

### 🎯 Upcoming (Phase 3)
- Authentication system with account claiming
- Comment and video systems
- Excel data import functionality
- Advanced audit and reporting features


## 🎯 Business Impact

### Immediate Benefits
- **90% Time Reduction**: Automated statistics calculation vs manual Excel
- **Real-Time Insights**: Instant access to player and team statistics
- **Error Elimination**: Automated calculations prevent manual mistakes
- **Self-Service Access**: Players can view their own statistics anytime

### Long-Term Vision
- **Scalability**: Foundation for multi-team support
- **Analytics**: Advanced AI-powered insights and predictions
- **Integration**: Payment systems and external sports platforms
- **Mobile App**: Native mobile applications for enhanced UX

## 🏆 Success Metrics

### Technical Achievements
- **100% Type Safety**: No TypeScript `any` types in production code
- **Sub-2s Loading**: All pages load within 2 seconds
- **99.9% Uptime**: Serverless architecture ensures high availability
- **Mobile-First**: Responsive design across all device sizes

### User Experience
- **Zero Training Required**: Intuitive interface for immediate adoption
- **Real-Time Updates**: Live statistics refresh without page reloads
- **Accessibility Compliant**: Full support for assistive technologies
- **Progressive Enhancement**: Works on all modern browsers

## 🚀 Deployment & Operations

### Production Environment
- **URL**: `https://meteor-fc-app.vercel.app` (Live Production)
- **Database**: Supabase PostgreSQL with automated backups
- **CDN**: Vercel Edge Network for global performance
- **Monitoring**: Real-time performance tracking and error reporting

### Development Process
- **Git Workflow**: Feature branches with pull request reviews
- **CI/CD**: Automatic deployment on merge to main branch
- **Environment Management**: Separate staging and production configs
- **Quality Assurance**: Automated type checking and build validation

---

This **Football Club Management System** represents a complete digital transformation from manual processes to a modern, scalable web platform. Built with cutting-edge technologies and following industry best practices, it provides immediate value while establishing a foundation for future enhancements and growth.

# 🎨 Design System & Style Guide

## 📖 Design Philosophy

### Core Principles
1. **Consistency Above All**: Follow established patterns to maintain cohesive user experience
2. **Mobile-First Design**: All interfaces must work perfectly on mobile devices
3. **Glassmorphism Aesthetic**: Transparent, blur effects for modern visual appeal
4. **Team Brand Integration**: Consistent use of team colors and identity
5. **Accessibility First**: Ensure all components are keyboard navigable and screen reader friendly

### Visual Hierarchy
- **Primary Actions**: Brand colors with high contrast
- **Secondary Actions**: Muted tones with clear visual separation
- **Information Display**: Clean typography with proper spacing
- **Data Visualization**: Color-coded for immediate understanding

## 🎯 Brand Identity

### Team Colors

#### Primary Brand Colors
- **Brand Blue**
  - HEX: `#7B8EE3`
  - CSS Variable: `var(--brand-blue)`
  - Tailwind: `bg-brand-blue` (if defined in tailwind.config.js)
  - Usage: Primary call-to-action (CTA) buttons, navigation highlights, key data emphasis

- **Light Purple**
  - HEX: `#B8AFFF`
  - CSS Variable: `var(--light-purple)`
  - Usage: Secondary brand color, gradient backgrounds, auxiliary emphasis

#### Text Colors
- **Primary Text Dark**: `#2C2C3E` - Main content text
- **Secondary Text Dark**: `#8A8A9E` - Supporting information text
- **Header Text Light**: `#FFFFFF` - Primary headings
- **Subheader Text Light**: `rgba(255, 255, 255, 0.75)` - Subtitles and descriptions

#### Glass Effect Colors
- **Glass Background**: `rgba(255, 255, 255, 0.25)` - Semi-transparent background
- **Glass Border**: `rgba(255, 255, 255, 0.2)` - Subtle glow border

#### Status Colors
- **Success Color**: `#4CAF50` - Success states and positive feedback
- **Warning Color**: `#FF9800` - Warnings and cautions
- **Gold**: `#FFC107` - Awards and highlights
- **Silver**: `#D0D3D8` - Secondary awards
- **Bronze**: `#CD7F32` - Third-tier awards

### Typography
- **Primary Font**: Mulish (weights: 400, 500, 600, 700, 800, 900)
- **Fallback Fonts**: Geist Sans, system fonts
- **Usage**: Mulish for user-facing content, Geist for admin interfaces

### Logo & Imagery
- **Team Logo**: `/meteor_fc.png` - used consistently across headers
- **Background Pattern**: Large watermark text "METEOR CLUB" with low opacity
- **Icon System**: Lucide React icons for consistent style

## 🏗️ Layout Systems

### Layout Pattern Descriptions

#### 1. Mobile Single-Column Flow Layout (User Interface)
- **Characteristics**: Vertically stacked card-based design, full-width container
- **Background**: Brand blue to light purple gradient background
- **Container**: Full viewport width, minimum height 100vh
- **Padding**: Top 30px, horizontal 25px
- **Responsive**: Centers on larger screens while maintaining mobile-first experience

#### 2. Classic Sidebar + Content Area Layout (Admin Dashboard)
- **Characteristics**: Standard admin interface layout
- **Container**: Centered alignment with max-width constraints
- **Padding**: Vertical 32px (py-8), element spacing 32px (space-y-8)
- **Header**: Combined title and description with support for action buttons
- **Content Area**: Flexible grid system with responsive breakpoints

### Grid System Descriptions

#### 1. Statistics Grid
- **Layout**: 3-column equal-width grid
- **Spacing**: 15px uniform spacing
- **Card Effects**: Glassmorphism effect with 15px border radius
- **Hover Effects**: Subtle lift and enhanced shadow

#### 2. Admin Interface Responsive Grid
- **Breakpoints**: Mobile 1 column, medium 2 columns, large 3 columns
- **Spacing**: 24px (gap-6) uniform spacing
- **Adaptability**: Auto-adjusting height based on content

## 🧩 Component Architecture

### Component Visual Forms and Interaction Behaviors

#### 1. Glass Cards
- **Visual Effect**: Semi-transparent cards with blurred backgrounds and subtle glow borders
- **Interaction Behavior**: Slight lift effect on hover (translateY(-2px))
- **Transition Animation**: 0.2s smooth transition including transform and shadow changes
- **Use Cases**: Primary content containers in user interface

#### 2. Modern Cards
- **Visual Effect**: Clean white backgrounds with subtle shadows and borders
- **Interaction Behavior**: Enhanced shadow on hover with smooth transitions
- **Structural Organization**: Hierarchical layout of title, description, and content
- **Use Cases**: Information display and action containers in admin interface

#### 3. Form Component Patterns

**User Interface Forms:**
- **Visual Style**: Glass effect backgrounds with unified spacing system
- **Layout Pattern**: Single column on mobile, dual-column grid on desktop
- **Interaction Feedback**: Real-time validation with clear error messages

**Admin Interface Forms:**
- **Visual Style**: Clean modern design with clear label associations
- **Layout Pattern**: Responsive grid with efficient space utilization
- **Interaction Feedback**: Instant validation with Toast notification system

## 📱 Responsive Design Rules

### Breakpoint Definitions
- **Mobile**: < 768px - Single column layout, full-width cards
- **Tablet**: 768px - 1024px - Dual-column grid, increased padding
- **Desktop**: ≥ 1024px - Three-column grid, maximum padding

### Layout Change Rules
- **Container Padding**: Mobile 20px → Tablet 30px → Desktop 40px
- **Grid Columns**: Mobile 1 column → Tablet 2 columns → Desktop 3 columns
- **Card Spacing**: Mobile 10px → Tablet 15px → Desktop 20px
- **Form Layout**: Mobile vertical stacking → Desktop horizontal distribution

## 🎨 Color Usage Guidelines

### Position Colors (eFootball Style)
- **Goalkeeper**: Yellow system - `text-yellow-600 bg-yellow-50`
- **Defenders**: Blue system - `text-blue-600 bg-blue-50`
- **Midfielders**: Green system - `text-green-600 bg-green-50`
- **Forwards**: Red system - `text-red-600 bg-red-50`

### Status Colors
- **Success**: Green system - `text-green-600 bg-green-50`
- **Warning**: Yellow system - `text-yellow-600 bg-yellow-50`
- **Error**: Red system - `text-red-600 bg-red-50`
- **Info**: Blue system - `text-blue-600 bg-blue-50`
- **Neutral**: Gray system - `text-gray-600 bg-gray-50`

## 🔄 Animation and Transition Standards

### Hover Effects
- **Transform Animation**: Subtle scaling (scale(1.02)) and lift (translateY(-2px))
- **Opacity Changes**: Reduce to 0.9 opacity
- **Transition Duration**: 0.2s with ease easing function

### Transition Standards
- **Micro-interaction Duration**: 0.2s - button clicks, hover effects
- **Page Transition Duration**: 0.3s - page switches, modal displays
- **Easing Functions**: `ease` for general animations, `ease-in-out` for complex transitions
- **Performance-optimized Properties**: Prioritize transform, opacity, box-shadow

# 💻 Frontend Development Standards (Implementation Guide)

## Core Philosophy
Our code philosophy has only one rule: **Consistency above all else**. Following this standard ensures maintainability, readability, and robustness of our codebase.

**Primary Rule: If shadcn/ui has it, never write it manually.**

## 1. Component Hierarchy
**Must follow this priority order strictly. No exceptions.**

🏆 **shadcn/ui Components**: Always the first choice (`@/components/ui`)  
🧩 **Custom Business Components**: Reusable business modules composed of shadcn/ui (`@/components/custom`)  
🧬 **Headless UI / Radix UI**: Only when shadcn/ui doesn't meet requirements, as building blocks  
❌ **Native HTML Interactive Elements**: Absolutely forbidden  

### 【ABSOLUTELY FORBIDDEN】
Never use these native HTML elements directly. Use corresponding shadcn/ui components:

- `<button>` → `<Button />`
- `<input>`, `<textarea>`, `<label>` → `<Input />`, `<Textarea />`, `<Label />`
- `<select>` → `<Select />`
- `<form>` → `<Form />` (with react-hook-form)
- `<table>` → `<Table />`
- `<dialog>` → `<Dialog />`
- `<img>` → `<Image />` (from next/image)
- `<a>` → `<Link />` (from next/link)

## 2. Data & Types (Using Zod)
We use Zod to unify runtime validation and static type inference. This ensures API data is absolutely safe before entering our application.

### Standard Workflow:

1. **Define Schema**: Create Zod schemas for all core data structures in `lib/validations/`
2. **Infer Type**: Use `z.infer<T>` to generate TypeScript types from schemas
3. **Apply Types**: Use inferred types in component Props, state management, and API functions

```typescript
// lib/validations/game.ts
import { z } from "zod";

// 1. Define Schema
export const gameSchema = z.object({
  id: z.string().uuid(),
  opponent: z.string(),
  date: z.string().datetime(),
  status: z.enum(["upcoming", "completed"]),
  score: z.object({
    home: z.number(),
    away: z.number(),
  }).optional(), // score is optional
});

// 2. Infer Type
export type Game = z.infer<typeof gameSchema>;

// Usage Example: API Response
const response = await fetch('/api/games');
const gamesData: Game[] = await response.json();

// Validate input in API Route
export async function POST(request: Request) {
  const validation = gameSchema.safeParse(await request.json());
  if (!validation.success) {
    return new Response("Invalid data", { status: 400 });
  }
  // validation.data is now type-safe
}
```

## 3. Component Development Best Practices

### ✅ Must DO

**Use shadcn/ui Components**
```tsx
import { Button } from "@/components/ui/button";
<Button variant="destructive" size="sm">Delete</Button>
```

**Use Zod-inferred Types for Props**
```tsx
import { type Game } from "@/lib/validations/game";

interface GameCardProps {
  game: Game;
  onViewDetails: (id: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onViewDetails }) => {
  // ...
};
```

**Properly Define State and Event Handler Types**
```tsx
const [games, setGames] = useState<Game[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(true);

const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // ...
};
```

**Handle Loading and Error States**
```tsx
if (isLoading) return <Skeleton className="h-24 w-full" />;
if (error) return <Alert variant="destructive">{error.message}</Alert>;
return <GameList games={games} />;
```

### ❌ Must NOT DO

**Never Use `any` Type**
```typescript
// ❌ Bad
const processData = (data: any) => { /* ... */ };
// ✅ Good
const processData = (data: Game) => { /* ... */ };
```

**Never Use Inline Styles**
```tsx
// ❌ Bad
<div style={{ padding: '16px', color: 'red' }}>Error</div>
// ✅ Good
<div className="p-4 text-destructive">Error</div>
```

**Never Ignore Accessibility**
```tsx
// ❌ Bad - using div as button
<div onClick={handler} className="cursor-pointer">Click me</div>
// ✅ Good - using Button component
<Button onClick={handler}>Click me</Button>
```

## 4. Styling Standards

### Primary: Tailwind Utility Classes
Always use Tailwind's atomic classes for styling and layout.

```tsx
// ✅ Correct
<div className="flex items-center justify-between rounded-lg bg-card p-4 shadow-sm">
  <h3 className="text-lg font-semibold text-card-foreground">Title</h3>
  <Button size="sm">Action</Button>
</div>
```

### Exception: CSS Modules
Only use CSS Modules when styles are extremely complex, tightly coupled with JS state, or require CSS features that Tailwind cannot achieve. Files should be stored in `styles/components/` directory.

```typescript
// styles/components/GameDetails.module.css
.complexAnimation {
  animation: customKeyframe 2s ease-in-out infinite;
}

@keyframes customKeyframe {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

## 5. File Structure
Maintaining a clear, consistent file structure is crucial.

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── _components/      # Page-private, non-reusable components
│   └── api/                  # API Routes
├── components/
│   ├── ui/                   # shadcn/ui original components (managed by CLI)
│   └── custom/               # Custom reusable business components (e.g., GameCard.tsx)
├── lib/
│   ├── utils.ts              # Common utility functions (e.g., cn)
│   └── validations/          # Zod Schemas (e.g., game.ts)
└── styles/
    └── globals.css           # Global styles and Tailwind configuration
```

### Key File Structure Rules:

- **`app/_components/`**: Page-specific components that are NOT reusable
- **`components/custom/`**: Business components that ARE reusable across pages
- **`components/ui/`**: Never modify manually - managed by shadcn/ui CLI
- **`lib/validations/`**: All Zod schemas organized by domain (game.ts, user.ts, etc.)

## 6. Quality Checklist

Before submitting code, check against this list:

### ✅ Components
- [ ] Used shadcn/ui components as first choice?
- [ ] No native HTML interactive elements used?
- [ ] All components have proper TypeScript interfaces?

### ✅ Types & Data
- [ ] Defined Zod schemas for all data structures?
- [ ] All Props and State have explicit types?
- [ ] No `any` types exist in the code?
- [ ] API responses validated with Zod schemas?

### ✅ Styling
- [ ] Used Tailwind utility classes primarily?
- [ ] Responsive design implemented (mobile-first)?
- [ ] Consistent spacing and sizing patterns?
- [ ] Dark mode support (if applicable)?

### ✅ Accessibility
- [ ] All clickable elements use `<Button>` or `<Link>`?
- [ ] Form elements have proper `<Label>` associations?
- [ ] Keyboard navigation supported?
- [ ] Screen reader compatibility ensured?

### ✅ State Management
- [ ] Loading states handled with proper UI feedback?
- [ ] Error states display user-friendly messages?
- [ ] Forms use react-hook-form with Zod validation?

### ✅ Performance
- [ ] Images use Next.js `<Image>` component?
- [ ] Navigation uses Next.js `<Link>` component?
- [ ] No unnecessary re-renders or memory leaks?

## 7. Development Workflow

### Adding New Components

1. **Check shadcn/ui first**: Can this be built with existing shadcn/ui components?
2. **Create Zod schema**: Define data structure in `lib/validations/`
3. **Build component**: Use TypeScript with inferred types
4. **Test thoroughly**: Verify functionality, responsiveness, and accessibility
5. **Review checklist**: Ensure all quality standards are met

### Example: Complete Component Development

```tsx
// 1. Define schema (lib/validations/player.ts)
export const playerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  position: z.enum(["GK", "DF", "MF", "FW"]),
  jerseyNumber: z.number().int().positive(),
  stats: z.object({
    goals: z.number().int().min(0),
    assists: z.number().int().min(0),
  }),
});

export type Player = z.infer<typeof playerSchema>;

// 2. Create component (components/custom/PlayerCard.tsx)
import { type Player } from "@/lib/validations/player";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  player: Player;
  onEdit?: (player: Player) => void;
  className?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onEdit,
  className = ""
}) => {
  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{player.name}</span>
          <Badge variant="secondary">{player.position}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Jersey #{player.jerseyNumber}
          </p>
          <div className="flex gap-4 text-sm">
            <span>Goals: {player.stats.goals}</span>
            <span>Assists: {player.stats.assists}</span>
          </div>
          {onEdit && (
            <Button 
              onClick={() => onEdit(player)} 
              variant="outline" 
              size="sm"
              className="w-full mt-4"
            >
              Edit Player
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// 3. Use in page (app/(dashboard)/players/page.tsx)
import { PlayerCard } from "@/components/custom/PlayerCard";
import { type Player } from "@/lib/validations/player";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Proper loading and error handling
  if (isLoading) return <div>Loading players...</div>;
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Team Players</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {players.map(player => (
          <PlayerCard 
            key={player.id}
            player={player}
            onEdit={handleEditPlayer}
          />
        ))}
      </div>
    </div>
  );
}
```

## 8. Code Implementation Examples

### Layout Implementation

#### Mobile-First Container (User Interface)
```css
.container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background-color: #d8dbe0;
  padding: 0;
}

.mobileView {
  width: 100vw;
  min-height: 100vh;
  background-image: linear-gradient(to bottom right, var(--brand-blue), var(--light-purple));
  padding: 30px 25px;
  position: relative;
}
```

#### Admin Dashboard Container (Modern UI)
```tsx
<div className="container mx-auto py-8 space-y-8">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold">Page Title</h1>
      <p className="text-muted-foreground">Page description</p>
    </div>
  </div>
  {/* Content */}
</div>
```

### Grid System Implementation

#### Statistics Grid (User Interface)
```css
.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-top: 20px;
}

.statCard {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 15px;
  padding: 20px;
  text-align: center;
}
```

#### Admin Interface Grid (Modern UI)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Card components */}
</div>
```

### Component Implementation

#### Glass Effect Cards (User Interface)
```css
.gameCard {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 15px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.gameCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
```

#### Modern Cards (Admin Interface)
```tsx
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Title
    </CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Form Layout Implementation

#### User Interface Forms
```css
.formGroup {
  margin-bottom: 20px;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

/* Mobile: Stack form elements */
@media (max-width: 767px) {
  .formRow {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
```

#### Admin Interface Forms
```tsx
<div className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="field">Field Label</Label>
      <Input id="field" />
    </div>
  </div>
</div>
```

### Data Display Implementation

#### User Interface Tables
```css
.attendanceTable {
  width: 100%;
  border-collapse: collapse;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  overflow: hidden;
}

.attendanceTable th,
.attendanceTable td {
  padding: 12px 8px;
  text-align: center;
  border-bottom: 1px solid var(--glass-border);
}
```

#### Admin Interface Tables
```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Column Header</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Cell Content</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### Statistics Display Implementation
```css
.statCard {
  text-align: center;
  background: var(--glass-bg);
  border-radius: 15px;
  padding: 20px;
}

.statNumber {
  font-size: 32px;
  font-weight: 800;
  color: var(--header-text-light);
  line-height: 1;
}

.statLabel {
  font-size: 14px;
  font-weight: 600;
  color: var(--subheader-text-light);
  margin-top: 8px;
}
```

### Animation Implementation

#### Hover Effects
```css
.clickable {
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.clickable:hover {
  transform: scale(1.02);
  opacity: 0.9;
}

.clickable:active {
  transform: scale(0.98);
}
```

#### Loading States
```css
.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: var(--header-text-light);
  font-weight: 600;
}
```

### Modal Implementation
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Modal description</DialogDescription>
    </DialogHeader>
    {/* Modal content */}
  </DialogContent>
</Dialog>
```

### Responsive Implementation
```css
/* Mobile First Approach */
.container {
  padding: 20px;
}

@media (min-width: 768px) {
  .container {
    padding: 30px;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 40px;
  }
}

/* Mobile: Full width cards */
.gameCard {
  width: 100%;
  margin-bottom: 15px;
}

@media (min-width: 768px) {
  .formRow {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
}
```

## Quick Reference Commands

```bash
# Add new shadcn/ui components
npx shadcn@latest add button card table select dialog input

# Install additional dependencies
npm install zod react-hook-form @hookform/resolvers
```

---

**Remember**: This standard exists to maintain consistency and quality. When in doubt, prioritize clarity and maintainability over cleverness. Every deviation from these standards should have a compelling reason and team approval.

Use TASK_BREAKDOWN_DETAILED.md to track the implement progress.
Use git to version control of the modification.
Use playwright to test the frontend logic.