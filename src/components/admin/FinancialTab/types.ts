// Financial Tab TypeScript Interfaces

export interface MatchWithFeeRates {
  id: string
  matchDate: Date | string
  opponentTeam: string
  fieldFeeTotal: number
  waterFeeTotal: number
  lateFeeRate?: number
  videoFeePerUnit?: number
  notes?: string
}

export interface FeeBreakdown {
  fieldFee: number
  videoFee: number
  lateFee: number
  total: number
}

export interface FeeOverrideData {
  fieldFeeOverride?: number
  videoFeeOverride?: number
  lateFeeOverride?: number
  notes?: string
}

export interface PlayerFeeDisplay {
  playerId: string
  playerName: string
  totalTime: number
  calculatedFee: FeeBreakdown
  overrideFee?: FeeBreakdown
  displayFee: number
  hasOverride: boolean
  paymentNote?: string
  isLate: boolean
}

export interface FeeSummaryData {
  totalParticipants: number
  totalFieldCosts: number
  totalCollectedFees: number
  averageFeePerPlayer: number
  profitLoss: number
}

export interface FeeEditFormData {
  fieldFee: number
  videoFee: number
  lateFee: number
  paymentNote: string
}

// API Response Types
export interface SaveFeeOverrideRequest {
  matchId: string
  playerId: string
  fieldFeeOverride?: number
  videoFeeOverride?: number
  lateFeeOverride?: number
  notes?: string
}

export interface DeleteFeeOverrideRequest {
  matchId: string
  playerId: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
  }
}