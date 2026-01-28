import { z } from 'zod'

// Match Info Schema
export const matchInfoSchema = z.object({
  id: z.string(),
  matchDate: z.string(),
  matchTime: z.string().nullable().optional(),
  opponentTeam: z.string(),
  ourScore: z.number().nullable().optional(),
  opponentScore: z.number().nullable().optional(),
  matchResult: z.enum(['WIN', 'LOSE', 'DRAW']).nullable().optional(),
  fieldFeeTotal: z.union([z.number(), z.string().transform(Number)]),
  waterFeeTotal: z.union([z.number(), z.string().transform(Number)]),
  lateFeeRate: z.union([z.number(), z.string().transform(Number)]).optional(),
  videoFeePerUnit: z.union([z.number(), z.string().transform(Number)]).optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type MatchInfo = z.infer<typeof matchInfoSchema>

// Player Schema
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  jerseyNumber: z.number().optional(),
  position: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  userType: z.enum(['ADMIN', 'PLAYER']),
  accountStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
  playerStatus: z.enum(['REGULAR', 'TRIAL', 'VACATION']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Player = z.infer<typeof playerSchema>

// Attendance Data Schema
export const attendanceDataSchema = z.object({
  userId: z.string(),
  section: z.number(),
  part: z.number(),
  value: z.number(),
  isGoalkeeper: z.boolean(),
  isLateArrival: z.boolean(),
  goals: z.number(),
  assists: z.number(),
  notes: z.string().nullable().optional(),
})

export type AttendanceDataItem = z.infer<typeof attendanceDataSchema>

export const attendanceGridSchema = z.array(attendanceDataSchema)

export type AttendanceGrid = z.infer<typeof attendanceGridSchema>

// Match Event Schema (Detailed)
export const matchEventSchema = z.object({
  id: z.string().optional(), // Optional for new events
  playerId: z.string(),
  eventType: z.enum([
    'GOAL', 
    'ASSIST', 
    'YELLOW_CARD', 
    'RED_CARD', 
    'PENALTY_GOAL', 
    'PENALTY_MISS',
    'OWN_GOAL',
    'SAVE'
  ]),
  minute: z.number().int().min(0).max(120).optional(),
  description: z.string().optional(),
})

export type MatchEvent = z.infer<typeof matchEventSchema>

// Fee Calculation Schema
export const feeCalculationSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  totalTime: z.number(),
  fieldFeeCalculated: z.number(),
  lateFee: z.number(),
  videoFee: z.number(),
  totalFeeCalculated: z.number(),
  paymentProxy: z.string().optional(),
  isLate: z.boolean(),
  notes: z.string().nullable().optional(),
})

export type FeeCalculation = z.infer<typeof feeCalculationSchema>

export const feeCalculationsSchema = z.array(feeCalculationSchema)

export type FeeCalculations = z.infer<typeof feeCalculationsSchema>

// Fee Override Schema (for manual adjustments)
export const feeOverrideSchema = z.object({
  userId: z.string(),
  fieldFee: z.number().optional(),
  videoFee: z.number().optional(),
  lateFee: z.number().optional(),
  notes: z.string().nullable().optional(),
})

export type FeeOverride = z.infer<typeof feeOverrideSchema>

export const feeOverridesSchema = z.record(z.string(), feeOverrideSchema)

export type FeeOverrides = z.infer<typeof feeOverridesSchema>

// Attendance Stats Schema
export const attendanceStatsSchema = z.object({
  totalParticipants: z.number(),
  totalGoals: z.number(),
  totalAssists: z.number(),
  averageAttendance: z.number(),
  goalkeeperCount: z.number(),
  lateArrivals: z.number(),
})

export type AttendanceStats = z.infer<typeof attendanceStatsSchema>

// API Request/Response Schemas
export const updateMatchInfoRequestSchema = z.object({
  opponentTeam: z.string().optional(),
  matchDate: z.string().optional(),
  matchTime: z.string().optional(),
  ourScore: z.number().nullable().optional(),
  opponentScore: z.number().nullable().optional(),
  fieldFeeTotal: z.number().optional(),
  waterFeeTotal: z.number().optional(),
  notes: z.string().nullable().optional(),
})

export type UpdateMatchInfoRequest = z.infer<typeof updateMatchInfoRequestSchema>

export const updatePlayersRequestSchema = z.object({
  playerIds: z.array(z.string()),
})

export type UpdatePlayersRequest = z.infer<typeof updatePlayersRequestSchema>

export const updateAttendanceRequestSchema = z.object({
  attendanceData: attendanceGridSchema,
  events: z.array(z.object({
    playerId: z.string(),
    eventType: z.enum([
      'GOAL', 
      'ASSIST', 
      'YELLOW_CARD', 
      'RED_CARD', 
      'PENALTY_GOAL', 
      'PENALTY_MISS',
      'OWN_GOAL',
      'SAVE'
    ]),
    minute: z.number().int().min(0).max(120).optional()
  })).optional(),
})

export type UpdateAttendanceRequest = z.infer<typeof updateAttendanceRequestSchema>

export const updateFeesRequestSchema = z.object({
  manualOverrides: feeOverridesSchema,
})

export type UpdateFeesRequest = z.infer<typeof updateFeesRequestSchema>