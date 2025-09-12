# Football Club Management System - Style Guide

## 📖 Overview

This style guide defines the design principles, visual elements, and component patterns for the Football Club Management System. It ensures consistency across both the legacy CSS Modules-based user interface and the modern shadcn/ui admin interface.

## 🎨 Design Philosophy

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
```css
/* Primary Brand Colors */
--brand-blue: #7B8EE3;      /* Primary brand color */
--light-purple: #B8AFFF;    /* Secondary brand color */

/* Text Colors */
--primary-text-dark: #2C2C3E;
--secondary-text-dark: #8A8A9E;
--header-text-light: #FFFFFF;
--subheader-text-light: rgba(255, 255, 255, 0.75);

/* Glass Effect Colors */
--glass-bg: rgba(255, 255, 255, 0.25);
--glass-border: rgba(255, 255, 255, 0.2);

/* Status Colors */
--success-color: #4CAF50;
--warning-color: #FF9800;
--gold: #FFC107;
--silver: #D0D3D8;
--bronze: #CD7F32;
```

### Typography
- **Primary Font**: Mulish (weights: 400, 500, 600, 700, 800, 900)
- **Fallback Fonts**: Geist Sans, system fonts
- **Usage**: Mulish for user-facing content, Geist for admin interfaces

### Logo & Imagery
- **Team Logo**: `/meteor_fc.png` - used consistently across headers
- **Background Pattern**: Large watermark text "METEOR CLUB" with low opacity
- **Icons**: Lucide React icons for consistent style

## 🏗️ Layout Systems

### Container Patterns

#### 1. **Mobile-First Container (User Interface)**
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

#### 2. **Admin Dashboard Container (Modern UI)**
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

### Grid Systems

#### 1. **Statistics Grid (User Interface)**
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

#### 2. **Admin Interface Grid (Modern UI)**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Card components */}
</div>
```

## 🧩 Component Architecture

### Component Hierarchy Priority

1. **shadcn/ui Components** (Highest Priority)
   - Always use for admin interfaces
   - Modern, accessible, consistent styling
   - Examples: `Button`, `Card`, `Dialog`, `Table`

2. **Custom Business Components**
   - Built on top of shadcn/ui
   - Examples: `PositionSelector`, `EditUserDialog`

3. **CSS Modules Components** (User Interface)
   - Legacy system for user-facing pages
   - Maintains existing visual consistency
   - Examples: HomePage, Leaderboard, GameDetails

4. **Never Use**
   - Raw HTML interactive elements (`<button>`, `<input>`, etc.)
   - Inline styles
   - Hardcoded colors or spacing

### UI Component Patterns

#### 1. **Glass Effect Cards (User Interface)**
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

#### 2. **Modern Cards (Admin Interface)**
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

#### 3. **Form Layout Patterns**

**User Interface Forms:**
```css
.formGroup {
  margin-bottom: 20px;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
```

**Admin Interface Forms:**
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

## 🎨 Color Usage Guidelines

### Position Colors (eFootball Style)
```tsx
const positionColors = {
  goalkeeper: "text-yellow-600 bg-yellow-50",    // Yellow
  defenders: "text-blue-600 bg-blue-50",        // Blue  
  midfielders: "text-green-600 bg-green-50",    // Green
  forwards: "text-red-600 bg-red-50"            // Red
}
```

### Status Colors
```tsx
const statusColors = {
  success: "text-green-600 bg-green-50",
  warning: "text-yellow-600 bg-yellow-50", 
  error: "text-red-600 bg-red-50",
  info: "text-blue-600 bg-blue-50",
  neutral: "text-gray-600 bg-gray-50"
}
```

### Badge Variations
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

## 📱 Responsive Design

### Breakpoints
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
```

### Mobile-Specific Patterns
```css
/* Mobile: Full width cards */
.gameCard {
  width: 100%;
  margin-bottom: 15px;
}

/* Mobile: Stack form elements */
.formRow {
  grid-template-columns: 1fr;
  gap: 10px;
}

@media (min-width: 768px) {
  .formRow {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
}
```

## 🔄 Animation Standards

### Hover Effects
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

### Loading States
```css
.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: var(--header-text-light);
  font-weight: 600;
}
```

### Transition Standards
- **Duration**: 0.2s for micro-interactions, 0.3s for page transitions
- **Easing**: `ease` for general animations, `ease-in-out` for complex transitions
- **Properties**: Transform, opacity, box-shadow for performance

## 📊 Data Display

### Table Patterns

**User Interface Tables:**
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

**Admin Interface Tables:**
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

### Statistics Display
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

## 🎯 Interaction Patterns

### Navigation
- **User Interface**: Card-based navigation with glass effects
- **Admin Interface**: Standard navigation with clear hierarchy
- **Breadcrumbs**: Use shadcn/ui breadcrumb component for admin pages

### Form Interaction
- **Validation**: Real-time with clear error messages
- **Submit States**: Loading indicators and success feedback
- **Toast Notifications**: `react-hot-toast` for user feedback

### Modal Patterns
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

## 🛠️ Development Guidelines

### Component Creation Checklist
- [ ] Use shadcn/ui components as base (for admin interfaces)
- [ ] Follow CSS Modules pattern (for user interfaces)
- [ ] Implement proper TypeScript interfaces
- [ ] Add responsive design considerations
- [ ] Include hover and focus states
- [ ] Test keyboard navigation
- [ ] Verify screen reader compatibility

### File Organization
```
src/
├── app/
│   ├── (dashboard)/          # User interface pages (CSS Modules)
│   ├── admin/               # Admin interface pages (shadcn/ui)
│   └── profile/             # Mixed interface pages
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── custom/              # Business logic components  
│   └── shared/              # Shared utility components
└── styles/
    └── globals.css          # Global styles and design tokens
```

### Code Quality Standards
- **Type Safety**: All components must have proper TypeScript interfaces
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Performance**: Optimize images, lazy load components, minimize re-renders
- **Consistency**: Follow established patterns within each interface type

## 🔍 Testing Guidelines

### Visual Testing
- Test on multiple screen sizes (320px, 768px, 1024px, 1440px)
- Verify glass effects work across browsers
- Check dark mode compatibility (where applicable)
- Validate color contrast ratios

### Functional Testing
- Keyboard navigation for all interactive elements
- Screen reader compatibility
- Form validation and error states
- Loading and success states

This style guide ensures consistent, accessible, and visually appealing interfaces across the entire Football Club Management System while respecting both legacy and modern design patterns.