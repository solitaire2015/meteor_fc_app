// Shared database-related types
export interface User {
  id: string
  name: string
  jerseyNumber?: number
  position?: string
  email?: string
  phone?: string
  userType: 'ADMIN' | 'PLAYER'
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  createdAt: string
  updatedAt: string
}

export interface Match {
  id: string
  matchDate: string
  matchTime?: string
  opponentTeam: string
  ourScore?: number
  opponentScore?: number
  matchResult?: 'WIN' | 'LOSE' | 'DRAW'
  fieldFeeTotal: number
  waterFeeTotal: number
  feeCoefficient: number
  notes?: string
  totalParticipants: number
  totalGoals: number
  totalAssists: number
  totalCalculatedFees: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface AttendanceData {
  userId: string
  section: number // 1, 2, 3
  part: number // 1, 2, 3
  value: number // 0, 0.5, 1
  isGoalkeeper: boolean // per-cell goalkeeper status
  isLateArrival: boolean // match-level flag
  goals: number
  assists: number
}

export interface MatchEvent {
  id: string
  matchId: string
  playerId: string
  eventType: 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'RED_CARD' | 'PENALTY_GOAL' | 'OWN_GOAL'
  minute?: number
  description?: string
  createdAt: string
}

export interface MatchParticipation {
  id: string
  userId: string
  matchId: string
  section1Part1: number
  section1Part2: number
  section1Part3: number
  section2Part1: number
  section2Part2: number
  section2Part3: number
  section3Part1: number
  section3Part2: number
  section3Part3: number
  isGoalkeeper: boolean
  totalTime: number
  fieldFeeCalculated: number
  isLate: boolean
  lateFee: number
  videoFee: number
  totalFeeCalculated: number
  paymentProxy?: string
  notes?: string
  createdAt: string
  updatedAt: string
}