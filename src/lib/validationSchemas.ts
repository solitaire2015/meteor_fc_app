import { z } from 'zod'

// Common validation schemas
export const IdParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
})

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10)
})

// User/Player schemas
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  jerseyNumber: z.number().int().min(1).optional(),
  position: z.string().max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  userType: z.enum(['ADMIN', 'PLAYER']).optional().default('PLAYER')
})

export const UpdateUserSchema = CreateUserSchema.partial()

// User deletion schemas
export const DeleteUserSchema = z.object({
  deletionReason: z.string().max(500).optional()
})

export const RestoreUserSchema = z.object({
  confirmed: z.boolean().default(true)
})

// Match schemas
export const CreateMatchSchema = z.object({
  matchDate: z.string().datetime(),
  matchTime: z.string().optional(),
  opponentTeam: z.string().min(1, 'Opponent team is required').max(100),
  ourScore: z.number().int().min(0).optional(),
  opponentScore: z.number().int().min(0).optional(),
  fieldFeeTotal: z.number().min(0),
  waterFeeTotal: z.number().min(0),
  notes: z.string().max(1000).nullable().optional()
})

export const UpdateMatchSchema = CreateMatchSchema.partial()

// Stats query schema
const optionalStatsNumber = (min: number, max: number) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === '') {
      return undefined
    }

    const numberValue = typeof value === 'string' ? Number(value) : value
    return Number.isNaN(numberValue) ? undefined : numberValue
  }, z.number().int().min(min).max(max).optional())

export const StatsQuerySchema = z.object({
  type: z.enum(['team', 'player']).optional(),
  year: optionalStatsNumber(2020, 2030),
  month: optionalStatsNumber(1, 12)
})

// Match event schema
export const CreateMatchEventSchema = z.object({
  playerId: z.string().min(1),
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
  description: z.string().max(255).optional()
})

// B1: New API endpoint schemas
export const MatchInfoUpdateSchema = z.object({
  opponentTeam: z.string().min(1).max(100).optional(),
  matchDate: z.string().datetime().optional(),
  matchTime: z.string().datetime().nullable().optional(), // Accept datetime string format like create match
  ourScore: z.number().int().min(0).nullable().optional(),
  opponentScore: z.number().int().min(0).nullable().optional(),
  sectionCount: z.number().int().min(1).max(6).optional(),
  fieldFeeTotal: z.number().min(0).optional(),
  waterFeeTotal: z.number().min(0).optional(),
  notes: z.string().max(1000).nullable().optional()
})

export const SelectedPlayersSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(0).max(50)
})

export const AttendanceUpdateSchema = z.object({
  attendanceData: z.record(z.string(), z.object({
    attendance: z.record(z.string(), z.record(z.string(), z.number().min(0).max(1))),
    goalkeeper: z.record(z.string(), z.record(z.string(), z.boolean())),
    isLateArrival: z.boolean()
  })),
  events: z.array(z.object({
    playerId: z.string().min(1),
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
  })).optional().default([]),
  matchInfo: z.object({
    fieldFeeTotal: z.number().min(0),
    waterFeeTotal: z.number().min(0),
    lateFeeRate: z.number().min(0).optional(),
    videoFeePerUnit: z.number().min(0).optional()
  }).optional(),
  selectedPlayerIds: z.array(z.string()).optional()
})

export const FeeOverrideSchema = z.object({
  fieldFeeOverride: z.number().min(0).nullable().optional(),
  videoFeeOverride: z.number().min(0).nullable().optional(),
  lateFeeOverride: z.number().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional()
})

export const FeesUpdateSchema = z.object({
  manualOverrides: z.record(z.string(), FeeOverrideSchema)
})

// Validation helper function
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: Record<string, unknown> } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: {
          issues: error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      }
    }
    return {
      success: false,
      error: 'Unknown validation error',
      details: { error: String(error) }
    }
  }
}
