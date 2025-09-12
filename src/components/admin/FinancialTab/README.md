# FinancialTab - Modern Fee Management Interface

## Overview

The FinancialTab has been completely modernized using shadcn/ui components with a mobile-first responsive design. It provides comprehensive fee management for match administration with support for manual overrides and detailed financial analytics.

## Features

### ✅ Implemented

1. **Modern UI Components**
   - Full shadcn/ui component integration
   - Mobile-first responsive design
   - Consistent styling with design system

2. **Fee Rate Display**
   - Shows match-specific fee rates (read-only)
   - Clear breakdown of base costs
   - Visual indicators for fee structure

3. **Fee Summary Analytics**
   - Real-time calculation of total fees
   - Profit/loss analysis
   - Detailed cost breakdown
   - Participant statistics

4. **Advanced Fee Table**
   - Desktop: Full table with all details
   - Mobile: Stacked card layout
   - Override indicators with badges
   - Click-to-edit functionality

5. **Fee Override System**
   - Component-level fee editing
   - Manual adjustment capability
   - Reset to calculated values
   - Payment notes support
   - Confirmation dialogs for destructive actions

6. **Enhanced UX**
   - Loading states with skeletons
   - Error handling with proper alerts
   - Optimistic UI updates
   - Toast notifications for feedback

## Architecture

### Component Structure
```
FinancialTab/
├── index.tsx                 # Main container component
├── types.ts                  # TypeScript interfaces
├── FeeRatesCard.tsx         # Match fee rates display
├── FeeSummaryCards.tsx      # Financial summary analytics
├── FeeTable.tsx             # Player fee table with mobile support
├── FeeEditDialog.tsx        # Fee editing modal
└── README.md                # This documentation
```

### Database Schema Updates
```sql
-- Added to matches table
ALTER TABLE matches ADD COLUMN late_fee_rate DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE matches ADD COLUMN video_fee_per_unit DECIMAL(10,2) DEFAULT 2.00;
```

### Key Features

#### Two-Table Architecture
- **match_participations**: Auto-calculated fees
- **fee_overrides**: Manual adjustments
- Preserves calculation history and audit trail

#### Fee Display Logic
```typescript
displayFee = override?.totalFee ?? calculated.totalFee
```

#### Mobile-First Design
- **< 768px**: Stacked cards, touch-friendly
- **768px - 1024px**: 2-column layout
- **≥ 1024px**: Full table layout

## Usage

### Basic Integration
```tsx
import FinancialTab from '@/components/admin/FinancialTab'

<FinancialTab
  match={matchData}  // Must include lateFeeRate, videoFeePerUnit
  users={playerList}
  attendance={attendanceGrid}
/>
```

### Fee Override Workflow
1. Click player row in fee table
2. Edit individual fee components in dialog
3. Add payment notes if needed
4. Save changes or reset to calculated values
5. Confirmation required for reset operations

## API Integration

### Required Endpoints
- `GET /api/admin/matches/${id}/fees` - Load comprehensive fee data with overrides
- `PUT /api/admin/matches/${id}/fees` - Save manual fee overrides
- `POST /api/admin/matches/${id}/notes` - Save payment notes (legacy - notes now included in overrides)

### Data Flow
1. Load match data with existing fees and overrides
2. Process and display with calculated vs override logic
3. Optimistic UI updates for better UX
4. Background sync with API
5. Error handling with fallback to reload

## Benefits

### For Administrators
- **Faster Operations**: Modern UI reduces clicks and complexity
- **Mobile Support**: Full functionality on mobile devices
- **Data Integrity**: Clear separation of calculated vs manual fees
- **Financial Insights**: Comprehensive profit/loss analysis

### For Development
- **Type Safety**: Full TypeScript coverage
- **Maintainability**: Clean component architecture
- **Consistency**: Follows established design patterns
- **Accessibility**: Keyboard navigation and screen reader support

## Future Enhancements

1. **Global Fee Settings**: Admin page for default fee rates
2. **Bulk Operations**: Multi-player fee adjustments
3. **Export Features**: Enhanced Excel/PDF export
4. **Analytics Dashboard**: Historical fee analysis
5. **Approval Workflow**: Multi-step fee override approvals

## Migration Notes

- Original FinancialTab.tsx redirects to new implementation
- CSS modules replaced with Tailwind + shadcn/ui
- All existing functionality preserved and enhanced
- Database schema updated with new fee rate fields
- Build passes with no TypeScript errors