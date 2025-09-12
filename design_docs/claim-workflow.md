# Ghost Player Claim Workflow

## Overview
The claim workflow allows real players to take ownership of ghost accounts created by admins.

## Workflow Diagram

```mermaid
sequenceDiagram
    participant Admin
    participant System
    participant GhostPlayer
    participant RealPlayer
    
    Note over Admin,System: Initial Setup Phase
    Admin->>System: Create ghost player account
    System->>System: Generate ghost account with name only
    System->>GhostPlayer: Status: GHOST (unclaimed)
    
    Note over System,RealPlayer: Claim Process Phase
    RealPlayer->>System: Register with email/phone
    System->>System: Check for matching name
    alt Name matches ghost account
        System->>RealPlayer: Show claim option
        RealPlayer->>System: Confirm claim request
        System->>Admin: Notify claim request (optional)
        
        alt Admin approval required
            Admin->>System: Approve/Reject claim
            System->>RealPlayer: Notify decision
        else Auto-approve
            System->>System: Auto-approve claim
        end
        
        System->>GhostPlayer: Transfer data to real account
        System->>RealPlayer: Account claimed successfully
        RealPlayer->>System: Set password & complete profile
    else No match found
        System->>RealPlayer: Create new account
        Admin->>System: Link to ghost manually (if needed)
    end
    
    Note over RealPlayer: Post-Claim Phase
    RealPlayer->>System: Login with credentials
    RealPlayer->>System: Edit allowed profile fields
    System->>System: Track as REGISTERED user
```

## Claim Process Options

### Option 1: Auto-Claim (Recommended)
- Player registers with matching name
- System automatically suggests claim
- No admin approval needed
- Fastest user experience

### Option 2: Admin Approval
- Player requests claim
- Admin reviews and approves
- More control but slower

### Option 3: Claim Code
- Admin generates unique claim code
- Share code with player offline
- Player uses code to claim account
- Most secure but requires coordination

## Implementation Steps

1. **Ghost Account Creation**
   - Admin creates player with minimal info
   - System marks as `userType: 'GHOST'`
   - No password set initially

2. **Registration Flow**
   - New user registers
   - System checks name similarity
   - Offer claim if match found

3. **Claim Validation**
   - Verify unclaimed status
   - Transfer historical data
   - Update user type to 'REGISTERED'

4. **Profile Completion**
   - Set password
   - Add contact info
   - Upload avatar
   - Select position details