// Common type definitions for the application

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: ValidationErrorDetail[];
  };
}

export interface ValidationErrorDetail {
  path: string[];
  message: string;
  code?: string;
}

// Error types for standardized error handling
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: ValidationErrorDetail[];
}

// Player statistics types
export interface PlayerStats {
  id: string;
  name: string;
  appearances: number;
  totalTime: number;
  goals: number;
  assists: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  penalties: number;
  saves: number;
  rank?: number;
}

// Fee override types
export interface FeeOverride {
  playerId: string;
  playerName: string;
  originalFee: number;
  overrideFee: number;
  note?: string;
}

// Match event types
export interface MatchEvent {
  id: string;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card';
  playerId: string;
  playerName: string;
  minute?: number;
  description?: string;
}

// Attendance data types
export interface AttendanceData {
  attendance?: {
    [sectionId: string]: {
      [timeSlot: string]: number; // 0, 0.5, or 1
    };
  };
  goalkeeper?: {
    [sectionId: string]: {
      [timeSlot: string]: boolean;
    };
  };
  isGoalkeeper?: boolean;
  lateFee?: number;
}

// Date filter types for queries
export interface DateFilter {
  gte?: Date;
  lte?: Date;
}

// Database where clause types
export interface WhereClause {
  [key: string]: unknown;
  date?: DateFilter;
}

// Excel export data types
export type ExcelRow = (string | number | null)[];
export type ExcelData = ExcelRow[];

// Participation with fees
export interface ParticipationWithFees {
  userId: string;
  userName: string;
  attendanceData: AttendanceData;
  calculatedFee: number;
  overrideFee?: number;
  finalFee: number;
  note?: string;
}

// Leaderboard player stats
export interface LeaderboardPlayerStats {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  position?: string | null;
  jerseyNumber?: number | null;
  playerStatus?: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  penaltyGoals: number;
  penaltyMisses: number;
  matches: Set<string>;
  lastMatchDate: Date | null;
  matchesPlayed?: number;
  rank?: number;
}

// Final leaderboard player object (after processing)
export interface LeaderboardPlayer {
  rank: number;
  id: string;
  name: string;
  abbreviation: string;
  avatarUrl?: string | null;
  position?: string | null;
  jerseyNumber?: number | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  penaltyGoals: number;
  penaltyMisses: number;
  matchesPlayed: number;
  lastMatchDate: Date | null;
}