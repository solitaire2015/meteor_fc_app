/**
 * Tests for FeeOverrideService
 */

import { FeeOverrideService } from '../feeOverrideService'
import { feeCalculationService } from '../feeCalculationService'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('../feeCalculationService')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockFeeCalculationService = feeCalculationService as jest.Mocked<typeof feeCalculationService>

describe('FeeOverrideService', () => {
  let service: FeeOverrideService

  beforeEach(() => {
    service = new FeeOverrideService()
    jest.clearAllMocks()
  })

  describe('applyOverride', () => {
    const validOverride = {
      fieldFeeOverride: 10.50,
      videoFeeOverride: 5.00,
      lateFeeOverride: 0,
      notes: 'Test override'
    }

    const mockPlayerFeeBreakdown = {
      playerId: 'player-1',
      playerName: 'Test Player',
      totalTime: 2.5,
      isLateArrival: false,
      calculatedFees: {
        normalPlayerParts: 2.5,
        sectionsWithNormalPlay: 1,
        fieldFee: 8.33,
        lateFee: 10,
        videoFee: 2,
        totalFee: 20.33
      },
      overrides: {
        fieldFeeOverride: 10.50,
        videoFeeOverride: 5.00,
        lateFeeOverride: 0,
        notes: 'Test override'
      },
      finalFees: {
        fieldFee: 10.50,
        videoFee: 5.00,
        lateFee: 0,
        totalFee: 15.50
      }
    }

    beforeEach(() => {
      mockFeeCalculationService.applyManualOverride.mockResolvedValue(mockPlayerFeeBreakdown)
    })

    it('should apply override successfully', async () => {
      const result = await service.applyOverride('match-1', 'player-1', validOverride)

      expect(result).toEqual(mockPlayerFeeBreakdown)
      expect(mockFeeCalculationService.applyManualOverride).toHaveBeenCalledWith(
        'match-1',
        'player-1',
        validOverride
      )
    })

    it('should validate override input', async () => {
      const invalidOverride = {
        fieldFeeOverride: -5.00, // negative value
        notes: 'Invalid override'
      }

      await expect(
        service.applyOverride('match-1', 'player-1', invalidOverride)
      ).rejects.toThrow('Override validation failed: Field fee override cannot be negative')
    })

    it('should warn about large overrides without notes', async () => {
      const largeOverrideWithoutNotes = {
        fieldFeeOverride: 300.00, // large value without proper justification
        notes: 'short'
      }

      // Should still apply but validate method will have warnings
      const validationResult = (service as any).validateOverride(largeOverrideWithoutNotes)
      expect(validationResult.warnings).toContain('Large overrides should include justification notes')
    })
  })

  describe('applyBulkOverrides', () => {
    const bulkInput = {
      overrides: [
        {
          playerId: 'player-1',
          override: {
            fieldFeeOverride: 10.00,
            notes: 'Override 1'
          }
        },
        {
          playerId: 'player-2',
          override: {
            videoFeeOverride: 5.00,
            notes: 'Override 2'
          }
        }
      ]
    }

    it('should apply all overrides successfully', async () => {
      const mockResults = [
        {
          playerId: 'player-1',
          playerName: 'Player 1',
          totalTime: 2,
          isLateArrival: false,
          calculatedFees: {} as any,
          overrides: { fieldFeeOverride: 10.00, notes: 'Override 1' },
          finalFees: {} as any
        },
        {
          playerId: 'player-2',
          playerName: 'Player 2',
          totalTime: 3,
          isLateArrival: true,
          calculatedFees: {} as any,
          overrides: { videoFeeOverride: 5.00, notes: 'Override 2' },
          finalFees: {} as any
        }
      ]

      mockFeeCalculationService.applyManualOverride
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])

      const result = await service.applyBulkOverrides('match-1', bulkInput)

      expect(result.success).toBe(true)
      expect(result.results).toEqual(mockResults)
      expect(result.errors).toHaveLength(0)
      expect(mockFeeCalculationService.applyManualOverride).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures', async () => {
      const mockSuccessResult = {
        playerId: 'player-1',
        playerName: 'Player 1',
        totalTime: 2,
        isLateArrival: false,
        calculatedFees: {} as any,
        overrides: null,
        finalFees: {} as any
      }

      mockFeeCalculationService.applyManualOverride
        .mockResolvedValueOnce(mockSuccessResult)
        .mockRejectedValueOnce(new Error('Player not found'))

      const result = await service.applyBulkOverrides('match-1', bulkInput)

      expect(result.success).toBe(false)
      expect(result.results).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toEqual({
        playerId: 'player-2',
        error: 'Player not found'
      })
    })

    it('should handle validation errors', async () => {
      const invalidBulkInput = {
        overrides: [
          {
            playerId: 'player-1',
            override: {
              fieldFeeOverride: -10.00, // invalid
              notes: 'Invalid override'
            }
          }
        ]
      }

      const result = await service.applyBulkOverrides('match-1', invalidBulkInput)

      expect(result.success).toBe(false)
      expect(result.results).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('Validation failed')
    })
  })

  describe('removeOverride', () => {
    it('should remove override successfully', async () => {
      const mockResult = {
        playerId: 'player-1',
        playerName: 'Test Player',
        totalTime: 2.5,
        isLateArrival: false,
        calculatedFees: {} as any,
        overrides: null,
        finalFees: {} as any
      }

      mockFeeCalculationService.removeOverride.mockResolvedValue(mockResult)

      const result = await service.removeOverride('match-1', 'player-1')

      expect(result).toEqual(mockResult)
      expect(mockFeeCalculationService.removeOverride).toHaveBeenCalledWith('match-1', 'player-1')
    })
  })

  describe('removeBulkOverrides', () => {
    it('should remove multiple overrides successfully', async () => {
      const playerIds = ['player-1', 'player-2']
      const mockResults = [
        {
          playerId: 'player-1',
          playerName: 'Player 1',
          totalTime: 2,
          isLateArrival: false,
          calculatedFees: {} as any,
          overrides: null,
          finalFees: {} as any
        },
        {
          playerId: 'player-2',
          playerName: 'Player 2',
          totalTime: 3,
          isLateArrival: true,
          calculatedFees: {} as any,
          overrides: null,
          finalFees: {} as any
        }
      ]

      mockFeeCalculationService.removeOverride
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])

      const result = await service.removeBulkOverrides('match-1', playerIds)

      expect(result.success).toBe(true)
      expect(result.results).toEqual(mockResults)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle partial failures during bulk removal', async () => {
      const playerIds = ['player-1', 'player-2']
      const mockSuccessResult = {
        playerId: 'player-1',
        playerName: 'Player 1',
        totalTime: 2,
        isLateArrival: false,
        calculatedFees: {} as any,
        overrides: null,
        finalFees: {} as any
      }

      mockFeeCalculationService.removeOverride
        .mockResolvedValueOnce(mockSuccessResult)
        .mockRejectedValueOnce(new Error('Player not found'))

      const result = await service.removeBulkOverrides('match-1', playerIds)

      expect(result.success).toBe(false)
      expect(result.results).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toEqual({
        playerId: 'player-2',
        error: 'Player not found'
      })
    })
  })

  describe('getOverrideHistory', () => {
    it('should return override history for a match', async () => {
      const mockOverrides = [
        {
          id: 'override-1',
          playerId: 'player-1',
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: 0,
          notes: 'Manual adjustment',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          player: { id: 'player-1', name: 'Player 1' }
        },
        {
          id: 'override-2',
          playerId: 'player-2',
          fieldFeeOverride: null,
          videoFeeOverride: 3.00,
          lateFeeOverride: null,
          notes: 'Video fee reduction',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          player: { id: 'player-2', name: 'Player 2' }
        }
      ]

      mockPrisma.feeOverride.findMany.mockResolvedValue(mockOverrides as any)

      const result = await service.getOverrideHistory('match-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'override-1',
        playerId: 'player-1',
        playerName: 'Player 1',
        fieldFeeOverride: 15.00,
        videoFeeOverride: null,
        lateFeeOverride: 0,
        notes: 'Manual adjustment',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      })

      expect(mockPrisma.feeOverride.findMany).toHaveBeenCalledWith({
        where: { matchId: 'match-1' },
        include: {
          player: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    })
  })

  describe('getPlayerOverrideHistory', () => {
    it('should return override history for a specific player', async () => {
      const mockOverrides = [
        {
          id: 'override-1',
          playerId: 'player-1',
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: null,
          notes: 'Player specific override',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          player: { id: 'player-1', name: 'Player 1' },
          match: {
            id: 'match-1',
            matchDate: new Date('2024-01-01'),
            opponentTeam: 'Opponent Team'
          }
        }
      ]

      mockPrisma.feeOverride.findMany.mockResolvedValue(mockOverrides as any)

      const result = await service.getPlayerOverrideHistory('player-1')

      expect(result).toHaveLength(1)
      expect(result[0].playerId).toBe('player-1')
      expect(result[0].playerName).toBe('Player 1')

      expect(mockPrisma.feeOverride.findMany).toHaveBeenCalledWith({
        where: { playerId: 'player-1' },
        include: {
          player: {
            select: {
              id: true,
              name: true
            }
          },
          match: {
            select: {
              id: true,
              matchDate: true,
              opponentTeam: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    })
  })

  describe('getOverrideStatistics', () => {
    it('should return comprehensive override statistics', async () => {
      const mockFeeBreakdown = {
        matchId: 'match-1',
        totalParticipants: 3,
        totalCalculatedFees: 30.00,
        totalFinalFees: 35.00,
        feeCoefficient: 2.5,
        players: [
          {
            playerId: 'player-1',
            playerName: 'Player 1',
            totalTime: 2,
            isLateArrival: false,
            calculatedFees: {} as any,
            overrides: {
              fieldFeeOverride: 15.00,
              videoFeeOverride: null,
              lateFeeOverride: 0,
              notes: 'Override 1'
            },
            finalFees: {} as any
          },
          {
            playerId: 'player-2',
            playerName: 'Player 2',
            totalTime: 3,
            isLateArrival: true,
            calculatedFees: {} as any,
            overrides: {
              fieldFeeOverride: null,
              videoFeeOverride: 5.00,
              lateFeeOverride: null,
              notes: 'Override 2'
            },
            finalFees: {} as any
          },
          {
            playerId: 'player-3',
            playerName: 'Player 3',
            totalTime: 1,
            isLateArrival: false,
            calculatedFees: {} as any,
            overrides: null,
            finalFees: {} as any
          }
        ]
      }

      mockFeeCalculationService.getFeeBreakdown.mockResolvedValue(mockFeeBreakdown)

      const result = await service.getOverrideStatistics('match-1')

      expect(result).toEqual({
        totalPlayers: 3,
        playersWithOverrides: 2,
        overridePercentage: 66.67, // 2/3 * 100
        totalCalculatedFees: 30.00,
        totalFinalFees: 35.00,
        feeDifference: 5.00,
        overrideTypes: {
          fieldFeeOverrides: 1,
          videoFeeOverrides: 1,
          lateFeeOverrides: 1
        }
      })
    })

    it('should handle zero participants', async () => {
      const mockFeeBreakdown = {
        matchId: 'match-1',
        totalParticipants: 0,
        totalCalculatedFees: 0,
        totalFinalFees: 0,
        feeCoefficient: 0,
        players: []
      }

      mockFeeCalculationService.getFeeBreakdown.mockResolvedValue(mockFeeBreakdown)

      const result = await service.getOverrideStatistics('match-1')

      expect(result.overridePercentage).toBe(0)
      expect(result.totalPlayers).toBe(0)
      expect(result.playersWithOverrides).toBe(0)
    })
  })

  describe('copyOverridesFromMatch', () => {
    it('should copy overrides to target match successfully', async () => {
      const sourceOverrides = [
        {
          playerId: 'player-1',
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: 0,
          notes: 'Source override',
          player: { id: 'player-1', name: 'Player 1' }
        }
      ]

      const mockTargetMatch = {
        id: 'target-match',
        opponentTeam: 'Target Opponent'
      }

      const mockTargetParticipation = {
        userId: 'player-1',
        matchId: 'target-match'
      }

      const mockPlayerFeeBreakdown = {
        playerId: 'player-1',
        playerName: 'Player 1',
        totalTime: 2,
        isLateArrival: false,
        calculatedFees: {} as any,
        overrides: {
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: 0,
          notes: 'Copied from match source-match: Source override'
        },
        finalFees: {} as any
      }

      mockPrisma.feeOverride.findMany.mockResolvedValue(sourceOverrides as any)
      mockPrisma.match.findUnique.mockResolvedValue(mockTargetMatch as any)
      mockPrisma.matchParticipation.findUnique.mockResolvedValue(mockTargetParticipation as any)
      mockFeeCalculationService.applyManualOverride.mockResolvedValue(mockPlayerFeeBreakdown)

      const result = await service.copyOverridesFromMatch('source-match', 'target-match')

      expect(result.success).toBe(true)
      expect(result.copiedCount).toBe(1)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)

      expect(mockFeeCalculationService.applyManualOverride).toHaveBeenCalledWith(
        'target-match',
        'player-1',
        {
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: 0,
          notes: 'Copied from match source-match: Source override'
        }
      )
    })

    it('should handle player mapping', async () => {
      const sourceOverrides = [
        {
          playerId: 'source-player-1',
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: null,
          notes: 'Source override',
          player: { id: 'source-player-1', name: 'Source Player 1' }
        }
      ]

      const playerMapping = new Map([
        ['source-player-1', 'target-player-1']
      ])

      const mockTargetMatch = {
        id: 'target-match',
        opponentTeam: 'Target Opponent'
      }

      const mockTargetParticipation = {
        userId: 'target-player-1',
        matchId: 'target-match'
      }

      mockPrisma.feeOverride.findMany.mockResolvedValue(sourceOverrides as any)
      mockPrisma.match.findUnique.mockResolvedValue(mockTargetMatch as any)
      mockPrisma.matchParticipation.findUnique.mockResolvedValue(mockTargetParticipation as any)
      mockFeeCalculationService.applyManualOverride.mockResolvedValue({} as any)

      const result = await service.copyOverridesFromMatch('source-match', 'target-match', playerMapping)

      expect(result.success).toBe(true)
      expect(result.copiedCount).toBe(1)

      expect(mockFeeCalculationService.applyManualOverride).toHaveBeenCalledWith(
        'target-match',
        'target-player-1', // mapped player ID
        expect.any(Object)
      )
    })

    it('should skip players not in target match', async () => {
      const sourceOverrides = [
        {
          playerId: 'player-1',
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: null,
          notes: 'Source override',
          player: { id: 'player-1', name: 'Player 1' }
        }
      ]

      mockPrisma.feeOverride.findMany.mockResolvedValue(sourceOverrides as any)
      mockPrisma.match.findUnique.mockResolvedValue({ id: 'target-match' } as any)
      mockPrisma.matchParticipation.findUnique.mockResolvedValue(null) // Player not in target match

      const result = await service.copyOverridesFromMatch('source-match', 'target-match')

      expect(result.success).toBe(true)
      expect(result.copiedCount).toBe(0)
      expect(result.skippedCount).toBe(1)
      expect(result.errors).toContain('Player Player 1 not found in target match')
    })

    it('should handle no source overrides', async () => {
      mockPrisma.feeOverride.findMany.mockResolvedValue([])

      const result = await service.copyOverridesFromMatch('source-match', 'target-match')

      expect(result.success).toBe(true)
      expect(result.copiedCount).toBe(0)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toEqual(['No overrides found in source match'])
    })
  })

  describe('validateOverride', () => {
    it('should validate correct override input', () => {
      const validOverride = {
        fieldFeeOverride: 10.50,
        videoFeeOverride: 5.00,
        lateFeeOverride: 0,
        notes: 'Valid override with sufficient justification'
      }

      const result = (service as any).validateOverride(validOverride)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect negative fee overrides', () => {
      const invalidOverride = {
        fieldFeeOverride: -5.00,
        videoFeeOverride: -2.00,
        lateFeeOverride: -1.00
      }

      const result = (service as any).validateOverride(invalidOverride)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Field fee override cannot be negative')
      expect(result.errors).toContain('Video fee override cannot be negative')
      expect(result.errors).toContain('Late fee override cannot be negative')
    })

    it('should warn about unusually high fees', () => {
      const highOverride = {
        fieldFeeOverride: 1500.00,
        videoFeeOverride: 150.00,
        lateFeeOverride: 100.00
      }

      const result = (service as any).validateOverride(highOverride)

      expect(result.isValid).toBe(true) // Valid but with warnings
      expect(result.warnings).toContain('Field fee override is unusually high (>1000)')
      expect(result.warnings).toContain('Video fee override is unusually high (>100)')
      expect(result.warnings).toContain('Late fee override is unusually high (>50)')
    })

    it('should warn about large overrides without proper notes', () => {
      const largeOverrideWithoutNotes = {
        fieldFeeOverride: 300.00,
        notes: 'short'
      }

      const result = (service as any).validateOverride(largeOverrideWithoutNotes)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Large overrides should include justification notes')
    })

    it('should reject notes that are too long', () => {
      const longNotesOverride = {
        fieldFeeOverride: 10.00,
        notes: 'x'.repeat(501) // Exceeds 500 character limit
      }

      const result = (service as any).validateOverride(longNotesOverride)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Notes cannot exceed 500 characters')
    })
  })
})