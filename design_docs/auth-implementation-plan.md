# Authentication Implementation Plan

## Overview
Implement a secure authentication system with ghost player claiming, using NextAuth.js and admin-controlled registration.

## Authentication Strategy

### 1. Registration Flow
Since normal user signup is disabled:
- **Admin creates ghost players** with name and optional contact info
- **Admin sets initial password** for players 
- **Players receive credentials** offline (WhatsApp/WeChat)
- **Players login and update** their profile

### 2. Claim Process (Simplified)
```
1. Admin creates ghost player "张三"
2. Admin sets password "changeme123" 
3. Admin shares credentials with player
4. Player logs in with name/password
5. Player updates password and profile
6. Account status changes from GHOST to CLAIMED
```

## Technical Implementation

### Phase 1: Basic Authentication (Today)
1. Install NextAuth.js and dependencies
2. Configure credentials provider
3. Create login/logout UI
4. Implement session management
5. Add password hashing with bcrypt

### Phase 2: Profile Management (Tomorrow)
1. Create profile editing page
2. Implement password change
3. Add position selector with icons
4. Prepare avatar upload UI (S3 setup later)

### Phase 3: AWS S3 Setup (Day 3)
1. Create AWS account and S3 bucket
2. Configure CloudFront CDN
3. Implement avatar upload
4. Add image optimization

## Profile Edit Permissions

### Player Can Edit:
- `name` - Display name
- `password` - Account password  
- `position` - Playing position (with new detailed options)
- `dominantFoot` - Preferred foot
- `avatarUrl` - Profile picture (after S3 setup)
- `introduction` - Bio/description
- `joinDate` - When joined the team

### Admin Only:
- `email` - Contact email
- `phone` - Contact phone
- `jerseyNumber` - Team jersey number
- `userType` - Admin/Player role
- `accountStatus` - Ghost/Claimed status
- All financial and match data

## Position Display Enhancement

### Position Categories with Icons:
```typescript
const positionGroups = {
  goalkeeper: {
    icon: '🥅',
    positions: ['GK']
  },
  defenders: {
    icon: '🛡️', 
    positions: ['CB', 'LB', 'RB', 'LWB', 'RWB']
  },
  midfielders: {
    icon: '⚡',
    positions: ['DMF', 'CMF', 'AMF', 'LMF', 'RMF']
  },
  forwards: {
    icon: '⚽',
    positions: ['CF', 'ST', 'SS', 'LWF', 'RWF']
  }
}
```

## Free Services Decision

### Recommendation: Start Simple
Given the small user base (~30 players):

1. **Initial Phase**: Admin-set passwords, no email verification
2. **Future Enhancement**: Add Resend.com (100 emails/day free)
3. **Optional**: Firebase Auth for phone verification later

This approach:
- ✅ Gets system running quickly
- ✅ No external dependencies initially  
- ✅ Can add verification later if needed
- ✅ Matches current offline coordination pattern

## Security Considerations

1. **Password Requirements**:
   - Minimum 8 characters
   - Force change on first login
   - Bcrypt hashing with salt rounds = 10

2. **Session Management**:
   - JWT tokens with 7-day expiry
   - Secure HTTP-only cookies
   - CSRF protection built-in

3. **Rate Limiting**:
   - Max 5 login attempts per minute
   - Account lockout after 10 failed attempts

## Next Steps

1. ✅ Extended position enum in database
2. ⏳ Install NextAuth.js and configure
3. ⏳ Create login/logout pages
4. ⏳ Implement profile editing
5. ⏳ Setup AWS S3 for avatars
6. ⏳ Update implementation plan tracking