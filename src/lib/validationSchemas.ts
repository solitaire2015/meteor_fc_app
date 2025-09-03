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

// Match schemas
export const CreateMatchSchema = z.object({
  matchDate: z.string().datetime(),
  matchTime: z.string().optional(),
  opponentTeam: z.string().min(1, 'Opponent team is required').max(100),
  ourScore: z.number().int().min(0).optional(),
  opponentScore: z.number().int().min(0).optional(),
  fieldFeeTotal: z.number().min(0),
  waterFeeTotal: z.number().min(0),
  feeCoefficient: z.number().min(0),
  notes: z.string().max(1000).optional()
})

export const UpdateMatchSchema = CreateMatchSchema.partial()

// Stats query schema
export const StatsQuerySchema = z.object({
  type: z.enum(['team', 'player']).optional(),
  year: z.coerce.number().int().min(2020).max(2030).optional(),
  month: z.coerce.number().int().min(1).max(12).optional()
})

// Match event schema
export const CreateMatchEventSchema = z.object({
  playerId: z.string().min(1),
  eventType: z.enum(['GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'PENALTY_GOAL', 'OWN_GOAL']),
  minute: z.number().int().min(0).max(120).optional(),
  description: z.string().max(255).optional()
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
          issues: error.errors.map(err => ({
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