// Shared database-related types

// Utility function to safely convert Prisma Decimal to number
export const decimalToNumber = (decimal: unknown): number => {
  if (typeof decimal === 'number') return decimal
  if (typeof decimal === 'string') return parseFloat(decimal)
  if (decimal && typeof decimal === 'object' && 'toNumber' in decimal && typeof (decimal as { toNumber: () => number }).toNumber === 'function') {
    return (decimal as { toNumber: () => number }).toNumber()
  }
  return Number(decimal) || 0
}
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
  isGoalkeeper: boolean // per-cell goalkeeper status (will be determined by section)
  isLateArrival: boolean // match-level flag
  goals: number
  assists: number
  notes?: string // Player notes from participation data
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

// JSONb structure for attendance data
export interface AttendanceDataJson {
  attendance: {
    [section: string]: {
      [part: string]: number // 0, 0.5, 1
    }
  }
  goalkeeper: {
    [section: string]: {
      [part: string]: boolean
    }
  }
}

export interface MatchParticipation {
  id: string
  userId: string
  matchId: string
  attendanceData: AttendanceDataJson
  isLateArrival: boolean
  totalTime: number
  fieldFeeCalculated: number
  lateFee: number
  videoFee: number
  totalFeeCalculated: number
  paymentProxy?: string
  notes?: string
  createdAt: string
  updatedAt: string
}