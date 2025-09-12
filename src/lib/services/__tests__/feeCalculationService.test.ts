/**
 * Tests for FeeCalculationService
 */

import { FeeCalculationService } from '../feeCalculationService'
import { prisma } from '@/lib/prisma'
import { calculatePlayerFees } from '@/lib/feeCalculation'
import { calculateCoefficient } from '@/lib/utils/coefficient'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('@/lib/feeCalculation')
jest.mock('@/lib/utils/coefficient')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCalculatePlayerFees = calculatePlayerFees as jest.MockedFunction<typeof calculatePlayerFees>
const mockCalculateCoefficient = calculateCoefficient as jest.MockedFunction<typeof calculateCoefficient>

describe('FeeCalculationService', () => {
  let service: FeeCalculationService

  beforeEach(() => {
    service = new FeeCalculationService()
    jest.clearAllMocks()
  })

  describe('calculatePlayerFees', () => {
    const mockMatch = {
      id: 'match-1',
      fieldFeeTotal: 200,
      waterFeeTotal: 50
    }

    const mockPlayer = {
      id: 'player-1',
      name: 'Test Player'
    }

    const mockAttendanceData = {
      attendance: {
        "1": { "1": 1, "2": 0.5, "3": 1 },
        "2": { "1": 0, "2": 0, "3": 0 },
        "3": { "1": 0, "2": 0, "3": 0 }
      },
      goalkeeper: {
        "1": { "1": false, "2": false, "3": false },
        "2": { "1": false, "2": false, "3": false },
        "3": { "1": false, "2": false, "3": false }
      }
    }

    const mockCalculatedFees = {
      normalPlayerParts: 2.5,
      sectionsWithNormalPlay: 1,
      fieldFee: 5.56,
      lateFee: 10,
      videoFee: 2,
      totalFee: 17.56
    }

    beforeEach(() => {
      mockPrisma.match.findUnique.mockResolvedValue(mockMatch as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockPlayer as any)
      mockPrisma.matchParticipation.findMany.mockResolvedValue([
        { totalTime: 10 }
      ] as any)
      mockPrisma.feeOverride.findUnique.mockResolvedValue(null)
      mockCalculateCoefficient.mockReturnValue(2.22)
      mockCalculatePlayerFees.mockReturnValue(mockCalculatedFees)
    })

    it('should calculate player fees correctly', async () => {
      const result = await service.calculatePlayerFees(
        'match-1',
        'player-1',
        mockAttendanceData,
        true
      )

      expect(result).toEqual({
        playerId: 'player-1',
        playerName: 'Test Player',
        totalTime: 2.5,
        isLateArrival: true,
        calculatedFees: mockCalculatedFees,
        overrides: null,
        finalFees: {
          fieldFee: 5.56,
          videoFee: 2,
          lateFee: 10,
          totalFee: 17.56
        }
      })

      expect(mockCalculatePlayerFees).toHaveBeenCalledWith({
        attendanceData: mockAttendanceData,
        isLateArrival: true,
        feeCoefficient: 2.22
      })
    })

    it('should apply fee overrides when they exist', async () => {
      const mockOverride = {
        fieldFeeOverride: 10.00,
        videoFeeOverride: null,
        lateFeeOverride: 0,
        notes: 'Test override'
      }

      mockPrisma.feeOverride.findUnique.mockResolvedValue(mockOverride as any)

      const result = await service.calculatePlayerFees(
        'match-1',
        'player-1',
        mockAttendanceData,
        true
      )

      expect(result.finalFees).toEqual({
        fieldFee: 10.00,  // overridden
        videoFee: 2,      // calculated (no override)
        lateFee: 0,       // overridden
        totalFee: 12.00   // recalculated
      })

      expect(result.overrides).toEqual({
        fieldFeeOverride: 10.00,
        videoFeeOverride: null,
        lateFeeOverride: 0,
        notes: 'Test override'
      })
    })

    it('should throw error when match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null)

      await expect(
        service.calculatePlayerFees('invalid-match', 'player-1', mockAttendanceData, false)
      ).rejects.toThrow('Match invalid-match not found')
    })

    it('should throw error when player not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(
        service.calculatePlayerFees('match-1', 'invalid-player', mockAttendanceData, false)
      ).rejects.toThrow('Player invalid-player not found')
    })
  })

  describe('recalculateAllFees', () => {
    it('should recalculate all fees while preserving overrides', async () => {
      const mockMatch = {
        id: 'match-1',
        fieldFeeTotal: 200,
        waterFeeTotal: 50
      }

      const mockParticipations = [
        {
          userId: 'player-1',
          attendanceData: {},
          isLateArrival: false,
          totalTime: 3,
          user: { id: 'player-1', name: 'Player 1' }
        },
        {
          userId: 'player-2',
          attendanceData: {},
          isLateArrival: true,
          totalTime: 2,
          user: { id: 'player-2', name: 'Player 2' }
        }
      ]

      const mockOverrides = [
        {
          playerId: 'player-1',
          fieldFeeOverride: 15.00,
          videoFeeOverride: null,
          lateFeeOverride: null
        }
      ]

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma as any))
      mockPrisma.match.findUnique.mockResolvedValue(mockMatch as any)
      mockPrisma.matchParticipation.findMany.mockResolvedValue(mockParticipations as any)
      mockPrisma.feeOverride.findMany.mockResolvedValue(mockOverrides as any)
      mockPrisma.matchParticipation.update.mockResolvedValue({} as any)

      mockCalculateCoefficient.mockReturnValue(2.5)
      mockCalculatePlayerFees.mockReturnValue({
        normalPlayerParts: 3,
        sectionsWithNormalPlay: 1,
        fieldFee: 7.5,
        lateFee: 0,
        videoFee: 2,
        totalFee: 9.5
      })

      const result = await service.recalculateAllFees('match-1')

      expect(result.matchId).toBe('match-1')
      expect(result.totalParticipants).toBe(2)
      expect(result.feeCoefficient).toBe(2.5)
      expect(result.players).toHaveLength(2)

      // Player 1 should have override applied
      const player1 = result.players.find(p => p.playerId === 'player-1')
      expect(player1?.finalFees.fieldFee).toBe(15.00) // overridden
      expect(player1?.finalFees.videoFee).toBe(2)     // calculated

      // Player 2 should have calculated fees
      const player2 = result.players.find(p => p.playerId === 'player-2')
      expect(player2?.finalFees.fieldFee).toBe(7.5)   // calculated
      expect(player2?.overrides).toBeNull()
    })
  })

  describe('applyManualOverride', () => {
    it('should apply manual override and update participation', async () => {
      const mockParticipation = {
        userId: 'player-1',
        attendanceData: {},
        isLateArrival: false,
        user: { id: 'player-1', name: 'Test Player' }
      }

      const mockMatch = {
        id: 'match-1',
        fieldFeeTotal: 200,
        waterFeeTotal: 50
      }

      const override = {
        fieldFeeOverride: 20.00,
        notes: 'Manual adjustment'
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma as any))
      mockPrisma.matchParticipation.findUnique.mockResolvedValue(mockParticipation as any)
      mockPrisma.match.findUnique.mockResolvedValue(mockMatch as any)
      mockPrisma.feeOverride.upsert.mockResolvedValue({} as any)
      mockPrisma.matchParticipation.update.mockResolvedValue({} as any)

      // Mock calculateTotalPlayTime
      jest.spyOn(service as any, 'calculateTotalPlayTime').mockResolvedValue(10)

      mockCalculateCoefficient.mockReturnValue(2.5)
      mockCalculatePlayerFees.mockReturnValue({
        normalPlayerParts: 2,
        sectionsWithNormalPlay: 1,
        fieldFee: 5.0,
        lateFee: 0,
        videoFee: 2,
        totalFee: 7.0
      })

      const result = await service.applyManualOverride('match-1', 'player-1', override)

      expect(result.overrides).toEqual({
        fieldFeeOverride: 20.00,
        videoFeeOverride: undefined,
        lateFeeOverride: undefined,
        notes: 'Manual adjustment'
      })

      expect(result.finalFees).toEqual({
        fieldFee: 20.00,  // overridden
        videoFee: 2,      // calculated
        lateFee: 0,       // calculated
        totalFee: 22.00   // recalculated
      })

      expect(mockPrisma.feeOverride.upsert).toHaveBeenCalledWith({
        where: {
          matchId_playerId: {
            matchId: 'match-1',
            playerId: 'player-1'
          }
        },
        update: expect.objectContaining({
          fieldFeeOverride: 20.00,
          notes: 'Manual adjustment'
        }),
        create: expect.objectContaining({
          matchId: 'match-1',
          playerId: 'player-1',
          fieldFeeOverride: 20.00,
          notes: 'Manual adjustment'
        })
      })
    })

    it('should throw error when participation not found', async () => {
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma as any))
      mockPrisma.matchParticipation.findUnique.mockResolvedValue(null)

      await expect(
        service.applyManualOverride('match-1', 'invalid-player', {})
      ).rejects.toThrow('Player invalid-player has no participation record for match match-1')
    })
  })

  describe('removeOverride', () => {
    it('should remove override and revert to calculated fees', async () => {
      const mockParticipation = {
        userId: 'player-1',
        attendanceData: {},
        isLateArrival: false,
        user: { id: 'player-1', name: 'Test Player' }
      }

      const mockMatch = {
        id: 'match-1',
        fieldFeeTotal: 200,
        waterFeeTotal: 50
      }

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma as any))
      mockPrisma.feeOverride.deleteMany.mockResolvedValue({ count: 1 } as any)
      mockPrisma.matchParticipation.findUnique.mockResolvedValue(mockParticipation as any)
      mockPrisma.match.findUnique.mockResolvedValue(mockMatch as any)
      mockPrisma.matchParticipation.update.mockResolvedValue({} as any)

      jest.spyOn(service as any, 'calculateTotalPlayTime').mockResolvedValue(10)

      mockCalculateCoefficient.mockReturnValue(2.5)
      mockCalculatePlayerFees.mockReturnValue({
        normalPlayerParts: 2,
        sectionsWithNormalPlay: 1,
        fieldFee: 5.0,
        lateFee: 0,
        videoFee: 2,
        totalFee: 7.0
      })

      const result = await service.removeOverride('match-1', 'player-1')

      expect(result.overrides).toBeNull()
      expect(result.finalFees).toEqual({
        fieldFee: 5.0,
        videoFee: 2,
        lateFee: 0,
        totalFee: 7.0
      })

      expect(mockPrisma.feeOverride.deleteMany).toHaveBeenCalledWith({
        where: {
          matchId: 'match-1',
          playerId: 'player-1'
        }
      })

      expect(mockPrisma.matchParticipation.update).toHaveBeenCalledWith({
        where: {
          userId_matchId: {
            userId: 'player-1',
            matchId: 'match-1'
          }
        },
        data: {
          fieldFeeCalculated: 5.0,
          videoFee: 2,
          lateFee: 0,
          totalFeeCalculated: 7.0
        }
      })
    })
  })

  describe('getFeeBreakdown', () => {
    it('should return comprehensive fee breakdown', async () => {
      const mockMatch = {
        id: 'match-1',
        fieldFeeTotal: 200,
        waterFeeTotal: 50
      }

      const mockParticipations = [
        {
          userId: 'player-1',
          attendanceData: {},
          isLateArrival: false,
          totalTime: 3,
          fieldFeeCalculated: 15.0,
          videoFee: 2,
          lateFee: 0,
          totalFeeCalculated: 17.0,
          user: { id: 'player-1', name: 'Player 1' }
        }
      ]

      const mockOverrides = [
        {
          playerId: 'player-1',
          fieldFeeOverride: 15.0,
          videoFeeOverride: null,
          lateFeeOverride: null,
          notes: 'Override note'
        }
      ]

      mockPrisma.match.findUnique.mockResolvedValue(mockMatch as any)
      mockPrisma.matchParticipation.findMany.mockResolvedValue(mockParticipations as any)
      mockPrisma.feeOverride.findMany.mockResolvedValue(mockOverrides as any)

      mockCalculateCoefficient.mockReturnValue(2.5)
      mockCalculatePlayerFees.mockReturnValue({
        normalPlayerParts: 3,
        sectionsWithNormalPlay: 1,
        fieldFee: 7.5,
        lateFee: 0,
        videoFee: 2,
        totalFee: 9.5
      })

      const result = await service.getFeeBreakdown('match-1')

      expect(result).toEqual({
        matchId: 'match-1',
        totalParticipants: 1,
        totalCalculatedFees: 9.5,
        totalFinalFees: 17.0,
        feeCoefficient: 2.5,
        players: [
          {
            playerId: 'player-1',
            playerName: 'Player 1',
            totalTime: 3,
            isLateArrival: false,
            calculatedFees: expect.objectContaining({
              fieldFee: 7.5,
              totalFee: 9.5
            }),
            overrides: {
              fieldFeeOverride: 15.0,
              videoFeeOverride: null,
              lateFeeOverride: null,
              notes: 'Override note'
            },
            finalFees: {
              fieldFee: 15.0,
              videoFee: 2,
              lateFee: 0,
              totalFee: 17.0
            }
          }
        ]
      })
    })
  })
})