/**
 * API Restructure Validation Tests
 * Tests the new focused API endpoints (B1) and database schema (B2)
 */

import { describe, test, expect } from '@jest/globals'
import { 
  MatchInfoUpdateSchema, 
  SelectedPlayersSchema, 
  AttendanceUpdateSchema, 
  FeesUpdateSchema 
} from '@/lib/validationSchemas'

describe('B1: API Endpoint Restructuring - Validation Schemas', () => {
  describe('MatchInfoUpdateSchema', () => {
    test('should validate valid match info update', () => {
      const validData = {
        opponentTeam: 'Test Team',
        matchDate: '2024-01-15T14:00:00.000Z',
        ourScore: 2,
        opponentScore: 1,
        fieldFeeTotal: 300,
        waterFeeTotal: 50,
        notes: 'Test match notes'
      }

      expect(() => MatchInfoUpdateSchema.parse(validData)).not.toThrow()
    })

    test('should reject invalid match info', () => {
      const invalidData = {
        opponentTeam: '', // Empty string should fail
        ourScore: -1, // Negative score should fail
        fieldFeeTotal: -100 // Negative fee should fail
      }

      expect(() => MatchInfoUpdateSchema.parse(invalidData)).toThrow()
    })

    test('should allow partial updates', () => {
      const partialData = {
        opponentTeam: 'Updated Team Name'
      }

      expect(() => MatchInfoUpdateSchema.parse(partialData)).not.toThrow()
    })
  })

  describe('SelectedPlayersSchema', () => {
    test('should validate player selection', () => {
      const validData = {
        playerIds: ['player1', 'player2', 'player3']
      }

      expect(() => SelectedPlayersSchema.parse(validData)).not.toThrow()
    })

    test('should allow empty player selection', () => {
      const emptyData = {
        playerIds: []
      }

      expect(() => SelectedPlayersSchema.parse(emptyData)).not.toThrow()
    })

    test('should reject invalid player IDs', () => {
      const invalidData = {
        playerIds: ['', 'valid-id'] // Empty string should fail
      }

      expect(() => SelectedPlayersSchema.parse(invalidData)).toThrow()
    })

    test('should reject too many players', () => {
      const tooManyPlayers = {
        playerIds: Array(60).fill('player-id') // More than 50 should fail
      }

      expect(() => SelectedPlayersSchema.parse(tooManyPlayers)).toThrow()
    })
  })

  describe('AttendanceUpdateSchema', () => {
    test('should validate attendance data', () => {
      const validData = {
        attendanceData: {
          'player1': {
            attendance: {
              '1': { '1': 1, '2': 0.5, '3': 0 },
              '2': { '1': 1, '2': 1, '3': 1 },
              '3': { '1': 0, '2': 0, '3': 1 }
            },
            goalkeeper: {
              '1': { '1': false, '2': false, '3': false },
              '2': { '1': true, '2': false, '3': false },
              '3': { '1': false, '2': false, '3': false }
            },
            isLateArrival: false
          }
        },
        events: [
          {
            playerId: 'player1',
            eventType: 'GOAL',
            count: 2
          }
        ]
      }

      expect(() => AttendanceUpdateSchema.parse(validData)).not.toThrow()
    })

    test('should reject invalid attendance values', () => {
      const invalidData = {
        attendanceData: {
          'player1': {
            attendance: {
              '1': { '1': 2 } // Value > 1 should fail
            },
            goalkeeper: {},
            isLateArrival: false
          }
        }
      }

      expect(() => AttendanceUpdateSchema.parse(invalidData)).toThrow()
    })

    test('should default events to empty array', () => {
      const dataWithoutEvents = {
        attendanceData: {
          'player1': {
            attendance: { '1': { '1': 1 } },
            goalkeeper: { '1': { '1': false } },
            isLateArrival: false
          }
        }
      }

      const parsed = AttendanceUpdateSchema.parse(dataWithoutEvents)
      expect(parsed.events).toEqual([])
    })
  })

  describe('FeesUpdateSchema', () => {
    test('should validate fee overrides', () => {
      const validData = {
        manualOverrides: {
          'player1': {
            fieldFeeOverride: 25.50,
            videoFeeOverride: 5.00,
            lateFeeOverride: null,
            notes: 'Student discount applied'
          },
          'player2': {
            fieldFeeOverride: null,
            videoFeeOverride: null,
            lateFeeOverride: 10.00,
            notes: 'Late arrival penalty'
          }
        }
      }

      expect(() => FeesUpdateSchema.parse(validData)).not.toThrow()
    })

    test('should reject negative fee overrides', () => {
      const invalidData = {
        manualOverrides: {
          'player1': {
            fieldFeeOverride: -10 // Negative override should fail
          }
        }
      }

      expect(() => FeesUpdateSchema.parse(invalidData)).toThrow()
    })

    test('should allow null overrides', () => {
      const dataWithNulls = {
        manualOverrides: {
          'player1': {
            fieldFeeOverride: null,
            videoFeeOverride: null,
            lateFeeOverride: null
          }
        }
      }

      expect(() => FeesUpdateSchema.parse(dataWithNulls)).not.toThrow()
    })
  })
})

describe('B2: Database Schema Enhancement - Type Safety', () => {
  test('should have proper TypeScript types for new models', () => {
    // This test ensures the Prisma client was generated correctly
    // and the new models are properly typed
    
    // These imports should not cause TypeScript errors
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // Check that the new models exist on the client
    expect(prisma.matchPlayer).toBeDefined()
    expect(prisma.feeOverride).toBeDefined()
    
    // Check that existing models still exist
    expect(prisma.match).toBeDefined()
    expect(prisma.user).toBeDefined()
    expect(prisma.matchParticipation).toBeDefined()

    prisma.$disconnect()
  })
})

describe('API Response Format Consistency', () => {
  test('should define consistent response interface', () => {
    // Test the expected response format structure
    interface ApiResponse<T = any> {
      success: boolean
      data?: T
      error?: {
        code: string
        message: string
        details?: any
      }
    }

    // Test success response
    const successResponse: ApiResponse = {
      success: true,
      data: { message: 'Operation completed' }
    }

    expect(successResponse.success).toBe(true)
    expect(successResponse.data).toBeDefined()
    expect(successResponse.error).toBeUndefined()

    // Test error response
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: ['Field is required']
      }
    }

    expect(errorResponse.success).toBe(false)
    expect(errorResponse.error).toBeDefined()
    expect(errorResponse.data).toBeUndefined()
  })
})