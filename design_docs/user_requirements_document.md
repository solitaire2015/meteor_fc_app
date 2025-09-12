# Football Club Management System - User Requirements Document

## 1. Executive Summary

The Football Club Management System is a comprehensive web application designed for managing a local football team's matches, player statistics, financial tracking, and content management. The system serves a single football team with approximately 30 players, supporting weekly match management, detailed statistics tracking, and administrative operations.

## 2. Project Background

### 2.1 Current Situation
- Weekly Saturday matches (11 vs 11 format)
- Manual record keeping using Excel spreadsheets
- Basic expense tracking and fee calculation
- Video sharing via cloud storage links
- Limited statistical analysis capabilities

### 2.2 Business Objectives
- Digitize match record management
- Automate statistical calculations and reporting
- Provide player self-service capabilities
- Maintain comprehensive audit trails
- Prepare for future payment system integration

## 3. User Roles and Personas

### 3.1 Admin
**Primary User**: Team manager/organizer
- **Responsibilities**: Match creation, data entry, user management, financial oversight
- **Technical Level**: Moderate
- **Key Needs**: Efficient data entry, comprehensive reporting, audit capabilities

### 3.2 Registered Player
**Primary User**: Active team members with accounts
- **Responsibilities**: Profile management, viewing statistics, commenting
- **Technical Level**: Basic to moderate
- **Key Needs**: Easy access to personal statistics, team information, match details

### 3.3 Guest Player
**Primary User**: Occasional participants without accounts
- **Responsibilities**: View match results and basic statistics
- **Technical Level**: Basic
- **Key Needs**: Read-only access to team information

## 4. Functional Requirements

### 4.1 Authentication and User Management

#### 4.1.1 User Registration and Authentication
- **REQ-001**: Admin can create "ghost" player profiles with minimal information (name only)
- **REQ-002**: Players can register accounts using email or phone number
- **REQ-003**: Admin can manually associate registered accounts with existing ghost profiles
- **REQ-004**: System supports role-based access control (Admin, Player, Guest)
- **REQ-005**: Ghost accounts allow match participation recording without full registration

#### 4.1.2 Profile Management
- **REQ-006**: Players can edit their profile information (name, jersey number, position, photo, introduction)
- **REQ-007**: Profile includes basic info: name, jersey number, position, join date
- **REQ-008**: Profile includes physical attributes: dominant foot preference
- **REQ-009**: Profile supports media: avatar image, personal introduction
- **REQ-010**: Career statistics automatically calculated and displayed

### 4.2 Match Management

#### 4.2.1 Match Creation and Configuration
- **REQ-011**: Admin can create new matches with basic information (date, time, opponent)
- **REQ-012**: Match supports 3 sections × 3 parts attendance tracking structure
- **REQ-013**: System calculates financial information based on attendance and rates
- **REQ-014**: Goalkeeper participation tracked separately (no field fee charges)

#### 4.2.2 Attendance Tracking
- **REQ-015**: Admin records player attendance for each section/part (0, 0.5, or 1.0 units)
- **REQ-016**: System supports late arrival tracking and automatic late fee calculation (10 yuan)
- **REQ-017**: Payment proxy functionality for players who pay for others
- **REQ-018**: Attendance data drives financial calculations automatically

#### 4.2.3 Match Events
- **REQ-019**: Admin records match events: goals, assists, yellow cards, red cards
- **REQ-020**: System tracks special events: penalties, own goals
- **REQ-021**: Events are attributed to specific players with timing information
- **REQ-022**: Match score and result recorded (win/lose/draw)

### 4.3 Statistical Analysis and Reporting

#### 4.3.1 Leaderboards
- **REQ-023**: Multiple leaderboard categories: goals, assists, appearances
- **REQ-024**: Additional leaderboard categories: penalties, yellow cards, red cards, own goals
- **REQ-025**: Goalkeeper-specific statistics: clean sheets, save rate
- **REQ-026**: Tabbed interface for easy navigation between categories
- **REQ-027**: Mobile-friendly swipe functionality for tab switching

#### 4.3.2 Statistics Calculation
- **REQ-028**: Year-based data separation (January-December)
- **REQ-029**: Career statistics aggregate across all years
- **REQ-030**: Monthly and yearly statistical breakdowns
- **REQ-031**: Team-level statistics: win/loss/draw records, goals for/against
- **REQ-032**: Real-time calculation from match data (no cached statistics tables)

#### 4.3.3 Financial Reporting
- **REQ-033**: Fee calculations displayed as reference (external payment processing)
- **REQ-034**: Monthly and yearly financial summaries
- **REQ-035**: Individual player financial history tracking
- **REQ-036**: Cost breakdown: field fees, late fees, video fees, facility costs

### 4.4 Content Management

#### 4.4.1 Video Management
- **REQ-037**: Configurable storage system supporting both local and AWS S3
- **REQ-038**: Admin video upload capability with metadata management
- **REQ-039**: Built-in video player for match viewing
- **REQ-040**: CloudFront CDN integration for S3-hosted videos
- **REQ-041**: Video metadata tracking: duration, file size, thumbnail

#### 4.4.2 Comment System
- **REQ-042**: Players can comment on matches with text and images
- **REQ-043**: Threaded comment system supporting replies
- **REQ-044**: Comment editing and deletion by original author
- **REQ-045**: Admin moderation capabilities for all comments
- **REQ-046**: Image upload with size and format restrictions (JPEG, PNG)

### 4.5 Data Management

#### 4.5.1 Excel Integration
- **REQ-047**: Admin can upload match data via Excel templates
- **REQ-048**: Excel template optimized for efficient data entry
- **REQ-049**: Support for importing historical match data
- **REQ-050**: Data validation and error reporting for Excel imports

#### 4.5.2 Audit and Logging
- **REQ-051**: Comprehensive audit trail for all data modifications
- **REQ-052**: Log format: "User X changed Player Y's goals from 1 to 2 at timestamp Z"
- **REQ-053**: Audit logs include before/after values for all changes
- **REQ-054**: Admin access to complete operation history

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
- **NFR-001**: Page load times under 3 seconds on standard broadband
- **NFR-002**: Video streaming with adaptive quality based on connection
- **NFR-003**: Efficient database queries for statistical calculations
- **NFR-004**: Responsive design supporting mobile and desktop devices

### 5.2 Security Requirements
- **NFR-005**: Secure password handling with proper hashing
- **NFR-006**: Role-based access control enforcement
- **NFR-007**: Input validation and sanitization for all user inputs
- **NFR-008**: Secure file upload with type and size validation

### 5.3 Usability Requirements
- **NFR-009**: Intuitive interface requiring minimal training
- **NFR-010**: Mobile-first responsive design
- **NFR-011**: Consistent navigation and UI patterns
- **NFR-012**: Clear error messages and user feedback

### 5.4 Scalability and Maintenance
- **NFR-013**: System supports up to 50 active players
- **NFR-014**: Database design supports 10+ years of historical data
- **NFR-015**: Modular architecture for future feature additions
- **NFR-016**: Comprehensive error logging and monitoring

## 6. User Stories

### 6.1 Admin User Stories

**US-001**: As an admin, I want to create match records so that I can track team performance and player participation.

**US-002**: As an admin, I want to upload match data via Excel so that I can efficiently enter large amounts of statistical data.

**US-003**: As an admin, I want to create player profiles so that I can track individual statistics even for occasional participants.

**US-004**: As an admin, I want to manage video uploads so that players can review match footage.

**US-005**: As an admin, I want to view audit logs so that I can track all changes made to the system.

**US-006**: As an admin, I want to moderate comments so that I can maintain appropriate content standards.

### 6.2 Player User Stories

**US-007**: As a player, I want to view my personal statistics so that I can track my performance over time.

**US-008**: As a player, I want to edit my profile information so that my details are current and accurate.

**US-009**: As a player, I want to comment on matches so that I can share thoughts and experiences with teammates.

**US-010**: As a player, I want to watch match videos so that I can review game footage and improve my performance.

**US-011**: As a player, I want to view team leaderboards so that I can see how I compare with teammates.

**US-012**: As a player, I want to claim my existing ghost profile so that I can access my historical statistics.

### 6.3 Guest User Stories

**US-013**: As a guest, I want to view match results so that I can stay informed about team performance.

**US-014**: As a guest, I want to see team statistics so that I can understand the team's overall performance.

## 7. System Constraints and Assumptions

### 7.1 Technical Constraints
- **TC-001**: Built using Next.js 14 with TypeScript
- **TC-002**: PostgreSQL database hosted on Supabase
- **TC-003**: Prisma ORM for database operations
- **TC-004**: AWS S3 + CloudFront for video hosting (configurable)

### 7.2 Business Constraints
- **BC-001**: System serves single football team only
- **BC-002**: Weekly match frequency (approximately 50 matches per year)
- **BC-003**: Payment processing remains external to system initially
- **BC-004**: Video files up to 2 hours, 1080p quality (~8-12GB each)

### 7.3 Assumptions
- **AS-001**: Admin has technical capability to perform Excel uploads
- **AS-002**: Players have basic smartphone/computer access
- **AS-003**: Internet connectivity available for video streaming
- **AS-004**: Team roster remains relatively stable (~30 players)

## 8. Future Enhancements

### 8.1 Payment Integration
- **FE-001**: In-app payment processing for match fees
- **FE-002**: Automated payment reminders and tracking
- **FE-003**: Financial reporting with payment status

### 8.2 Advanced Features
- **FE-004**: Push notifications for match reminders
- **FE-005**: Real-time match updates during games
- **FE-006**: Advanced analytics with charts and trends
- **FE-007**: Mobile application for iOS/Android

### 8.3 Integration Capabilities
- **FE-008**: Calendar integration for match scheduling
- **FE-009**: Social media sharing of match highlights
- **FE-010**: Export capabilities for external analysis tools

## 9. Acceptance Criteria

### 9.1 Core Functionality
- All user stories must be implemented and tested
- System successfully handles ghost account to claimed account workflow
- Excel import successfully processes sample match data
- Video upload and streaming works with both local and S3 storage
- Statistical calculations match manual verification

### 9.2 Performance Criteria
- Page load times meet specified requirements
- Video streaming performs adequately on standard connections
- Database queries execute efficiently for statistical calculations
- Mobile interface provides full functionality

### 9.3 Security and Audit
- All user inputs properly validated and sanitized
- Audit trails capture all data modifications accurately
- Role-based access control prevents unauthorized operations
- File uploads secured against malicious content

## 10. Glossary

**Ghost Account**: A player profile created by admin with minimal information, allowing match participation tracking before full user registration.

**Match Participation**: Individual player's involvement in a specific match, including attendance tracking across 9 time segments.

**Section/Part**: Match time division structure where each match has 3 sections, and each section has 3 parts (total 9 segments).

**Fee Coefficient**: Cost per time unit used to calculate individual player expenses based on attendance.

**Claimed Account**: A user account that has been registered by a player and linked to their match history.

**Match Event**: Specific occurrences during a match (goals, assists, cards) attributed to individual players.

This document serves as the foundation for system development and will be updated as requirements evolve during the development process.