// Standardized API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ErrorResponse {
  success: false
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'SERVER_ERROR'
    message: string
    details?: Record<string, unknown>
  }
}

// API request types
export interface CreateUserRequest {
  name: string
  jerseyNumber?: number
  position?: string
  email?: string
  phone?: string
  userType?: 'ADMIN' | 'PLAYER'
}

export interface CreateMatchRequest {
  matchDate: string
  matchTime?: string
  opponentTeam: string
  ourScore?: number
  opponentScore?: number
  fieldFeeTotal: number
  waterFeeTotal: number
  feeCoefficient: number
  notes?: string
  createdBy: string
}

export interface StatsQuery {
  type?: 'team' | 'player'
  year?: string
  month?: string
}

// Financial calculation types
export interface PlayerFinancialData {
  userId: string
  userName: string
  totalTime: number
  fieldFeeCalculated: number
  lateFee: number
  videoFee: number
  totalFeeCalculated: number
  paymentProxy?: string
  isLate: boolean
}

export interface FinancialData {
  totalParticipants: number
  totalFieldFees: number
  totalVideoFees: number
  totalLateFees: number
  grandTotal: number
  averageFeePerPlayer: number
  playerFinancials: PlayerFinancialData[]
}