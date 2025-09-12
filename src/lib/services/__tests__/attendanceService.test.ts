/**
 * Tests for AttendanceService
 */

import { AttendanceService } from '../attendanceService'
import { feeCalculationService } from '../feeCalculationService'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('../feeCalculationService')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockFeeCalculationService = feeCalculationService as jest.Mocked<typeof feeCalculationService>

describe('AttendanceService', () => {
  let service: AttendanceService

  beforeEach(() => {
    service = new AttendanceService()
    jest.clearAllMocks()
  })

  describe('validateAttendanceData', () => {
    const validAttendanceData = {
      'player-1': {
        attendance: {
          "1": { "1": 1, "2": 0.5, "3": 1 },
          "2": { "1": 0, "2": 0, "3": 0 },
          "3": { "1": 0, "2": 0, "3": 0 }
        },
        goalkeeper: {
          "1": { "1": false, "2": false, "3": false },
          "2": { "1": false, "2": false, "3": false },
          "3": { "1": false, "2": false, "3": false }
        },
        isLateArrival: false
      },
      'player-2': {
        attendance: {
          "1": { "1": 0, "2": 0, "3": 0 },
          "2": { "1": 1, "2": 1, "3": 1 },
          "3": { "1": 0, "2": 0, "3": 0 }
        },
        goalkeeper: {
          "1": { "1": false, "2": false, "3": false },
          "2": { "1": true, "2": false, "3": false },
          "3": { "1": false, "2": false, "3": false }
        },
        isLateArrival: true
      }
    }

    beforeEach(() => {
      mockPrisma.matchPlayer.findMany.mockResolvedValue([
        { playerId: 'player-1', player: { id: 'player-1', name: 'Player 1' } },
        { playerId: 'player-2', player: { id: 'player-2', name: 'Player 2' } }
      ] as any)
    })

    it('should validate attendance data successfully', async () => {
      const result = await service.validateAttendanceData('match-1', validAttendanceData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should detect unselected players', async () => {
      mockPrisma.matchPlayer.findMany.mockResolvedValue([
        { playerId: 'player-1', player: { id: 'player-1', name: 'Player 1' } }
      ] as any)

      const result = await service.validateAttendanceData('match-1', validAttendanceData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Players not selected for this match: player-2')
    })

    it('should detect goalkeeper conflicts', async () => {
      const conflictingData = {
        'player-1': {
          ...validAttendanceData['player-1'],
          goalkeeper: {
            "1": { "1": true, "2": false, "3": false },  // Conflict with player-2
            "2": { "1": false, "2": false, "3": false },
            "3": { "1": false, "2": false, "3": false }
          }
        },
        'player-2': {
          ...validAttendanceData['player-2'],
          goalkeeper: {
            "1": { "1": true, "2": false, "3": false },  // Conflict with player-1
            "2": { "1": false, "2": false, "3": false },
            "3": { "1": false, "2": false, "3": false }
          }
        }
      }

      const result = await service.validateAttendanceData('match-1', conflictingData)

      expect(result.isValid).toBe(true) // Still valid because conflicts can be auto-resolved
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toEqual({
        section: 1,
        part: 1,
        existingGoalkeeperId: 'player-1',
        existingGoalkeeperName: 'Player 1',
        newGoalkeeperId: 'player-2',
        newGoalkeeperName: 'Player 2'
      })
      expect(result.warnings).toContain('Found 1 goalkeeper conflict(s) that will be auto-resolved')
    })

    it('should detect invalid attendance structure', async () => {
      const invalidData = {
        'player-1': {
          attendance: {
            "1": { "1": 2 }  // Invalid: attendance > 1
          },
          goalkeeper: {},
          isLateArrival: false
        }
      }

      const result = await service.validateAttendanceData('match-1', invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid attendance data structure for player player-1')
    })
  })

  describe('autoResolveGoalkeeperConflicts', () => {
    it('should resolve goalkeeper conflicts by unsetting previous goalkeeper', () => {
      const attendanceData = {
        'player-1': {
          attendance: {
            "1": { "1": 1, "2": 0, "3": 0 },
            "2": { "1": 0, "2": 0, "3": 0 },
            "3": { "1": 0, "2": 0, "3": 0 }
          },
          goalkeeper: {
            "1": { "1": true, "2": false, "3": false },
            "2": { "1": false, "2": false, "3": false },
            "3": { "1": false, "2": false, "3": false }
          },
          isLateArrival: false
        },
        'player-2': {
          attendance: {
            "1": { "1": 1, "2": 0, "3": 0 },
            "2": { "1": 0, "2": 0, "3": 0 },
            "3": { "1": 0, "2": 0, "3": 0 }
          },
          goalkeeper: {
            "1": { "1": true, "2": false, "3": false },
            "2": { "1": false, "2": false, "3": false },
            "3": { "1": false, "2": false, "3": false }
          },
          isLateArrival: false
        }
      }

      const conflicts = [
        {
          section: 1,
          part: 1,
          existingGoalkeeperId: 'player-1',
          existingGoalkeeperName: 'Player 1',
          newGoalkeeperId: 'player-2',
          newGoalkeeperName: 'Player 2'
        }
      ]

      const result = service.autoResolveGoalkeeperConflicts(attendanceData, conflicts)

      // Player 1 should be unset as goalkeeper and attendance set to 0
      expect(result['player-1'].goalkeeper["1"]["1"]).toBe(false)
      expect(result['player-1'].attendance["1"]["1"]).toBe(0)

      // Player 2 should remain as goalkeeper
      expect(result['player-2'].goalkeeper["1"]["1"]).toBe(true)
      expect(result['player-2'].attendance["1"]["1"]).toBe(1)
    })
  })

  describe('updateAttendance', () => {
    const mockUpdateRequest = {
      attendanceData: {
        'player-1': {
          attendance: {
            "1": { "1": 1, "2": 0.5, "3": 1 },
            "2": { "1": 0, "2": 0, "3": 0 },
            "3": { "1": 0, "2": 0, "3": 0 }
          },
          goalkeeper: {
            "1": { "1": false, "2": false, "3": false },
            "2": { "1": false, "2": false, "3": false },
            "3": { "1": false, "2": false, "3": false }
          },
          isLateArrival: false
        }
      },
      events: [
        {
          playerId: 'player-1',
          eventType: 'GOAL' as const,
          count: 2
        }
      ]
    }

    beforeEach(() => {
      // Mock validation to pass
      jest.spyOn(service, 'validateAttendanceData').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        conflicts: [],
        resolvedData: mockUpdateRequest.attendanceData
      })

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma as any))
      mockPrisma.match.findUnique.mockResolvedValue({
        id: 'match-1',
        fieldFeeTotal: 200,
        waterFeeTotal: 50
      } as any)
      
      mockPrisma.matchParticipation.deleteMany.mockResolvedValue({ count: 0 } as any)
      mockPrisma.matchEvent.deleteMany.mockResolvedValue({ count: 0 } as any)
      mockPrisma.matchParticipation.createMany.mockResolvedValue({ count: 1 } as any)
      mockPrisma.matchEvent.createMany.mockResolvedValue({ count: 2 } as any)

      mockFeeCalculationService.recalculateAllFees.mockResolvedValue({
        matchId: 'match-1',
        totalParticipants: 1,
        totalCalculatedFees: 10,
        totalFinalFees: 10,
        feeCoefficient: 2.22,
        players: []
      })
    })

    it('should update attendance successfully', async () => {
      const result = await service.updateAttendance('match-1', mockUpdateRequest)

      expect(result.success).toBe(true)
      expect(result.data.participationsCount).toBe(1)
      expect(result.data.eventsCount).toBe(2)
      expect(result.data.feeCoefficient).toBe(2.22)
      expect(result.data.conflictsResolved).toBe(0)

      expect(mockPrisma.matchParticipation.deleteMany).toHaveBeenCalledWith({
        where: { matchId: 'match-1' }
      })
      expect(mockPrisma.matchEvent.deleteMany).toHaveBeenCalledWith({
        where: { matchId: 'match-1' }
      })
      expect(mockFeeCalculationService.recalculateAllFees).toHaveBeenCalledWith('match-1')
    })

    it('should handle validation errors', async () => {
      jest.spyOn(service, 'validateAttendanceData').mockResolvedValue({
        isValid: false,
        errors: ['Test validation error'],
        warnings: [],
        conflicts: []
      })

      await expect(
        service.updateAttendance('match-1', mockUpdateRequest)
      ).rejects.toThrow('Attendance validation failed: Test validation error')
    })

    it('should handle goalkeeper conflicts', async () => {
      const conflicts = [
        {
          section: 1,
          part: 1,
          existingGoalkeeperId: 'player-1',
          existingGoalkeeperName: 'Player 1',
          newGoalkeeperId: 'player-2',
          newGoalkeeperName: 'Player 2'
        }
      ]

      jest.spyOn(service, 'validateAttendanceData').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['Found 1 goalkeeper conflict(s) that will be auto-resolved'],
        conflicts,
        resolvedData: mockUpdateRequest.attendanceData
      })

      const result = await service.updateAttendance('match-1', mockUpdateRequest)

      expect(result.success).toBe(true)
      expect(result.data.conflictsResolved).toBe(1)
      expect(result.data.warnings).toContain('Found 1 goalkeeper conflict(s) that will be auto-resolved')
    })

    it('should throw error when match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null)

      await expect(
        service.updateAttendance('invalid-match', mockUpdateRequest)
      ).rejects.toThrow('Match invalid-match not found')
    })
  })

  describe('getAttendanceData', () => {
    it('should return attendance data with selected players', async () => {
      const mockMatchPlayers = [
        { playerId: 'player-1' },
        { playerId: 'player-2' }
      ]

      const mockParticipations = [
        {
          userId: 'player-1',
          attendanceData: {
            attendance: { "1": { "1": 1 } },
            goalkeeper: { "1": { "1": false } }
          },
          isLateArrival: false,
          user: { id: 'player-1', name: 'Player 1', jerseyNumber: 10, position: 'CF' }
        }
      ]

      const mockEvents = [
        {
          playerId: 'player-1',
          eventType: 'GOAL',
          player: { id: 'player-1', name: 'Player 1' }
        },
        {
          playerId: 'player-1',
          eventType: 'ASSIST',
          player: { id: 'player-1', name: 'Player 1' }
        }
      ]

      mockPrisma.matchPlayer.findMany.mockResolvedValue(mockMatchPlayers as any)
      mockPrisma.matchParticipation.findMany.mockResolvedValue(mockParticipations as any)
      mockPrisma.matchEvent.findMany.mockResolvedValue(mockEvents as any)

      const result = await service.getAttendanceData('match-1')

      expect(result.selectedPlayers).toEqual(['player-1', 'player-2'])
      expect(result.totalParticipants).toBe(1)
      expect(result.totalEvents).toBe(2)
      
      expect(result.attendanceData['player-1']).toEqual({
        attendance: { "1": { "1": 1 } },
        goalkeeper: { "1": { "1": false } },
        isLateArrival: false,
        user: { id: 'player-1', name: 'Player 1', jerseyNumber: 10, position: 'CF' }
      })

      expect(result.eventsSummary['player-1']).toEqual({
        goals: 1,
        assists: 1
      })
    })

    it('should handle penalty goals as goals', async () => {
      const mockEvents = [
        {
          playerId: 'player-1',
          eventType: 'PENALTY_GOAL',
          player: { id: 'player-1', name: 'Player 1' }
        }
      ]

      mockPrisma.matchPlayer.findMany.mockResolvedValue([])
      mockPrisma.matchParticipation.findMany.mockResolvedValue([])
      mockPrisma.matchEvent.findMany.mockResolvedValue(mockEvents as any)

      const result = await service.getAttendanceData('match-1')

      expect(result.eventsSummary['player-1']).toEqual({
        goals: 1,
        assists: 0
      })
    })
  })

  describe('previewGoalkeeperConflicts', () => {
    it('should return conflicts without saving', async () => {
      const attendanceData = {
        'player-1': {
          attendance: {
            "1": { "1": 1, "2": 0, "3": 0 },
            "2": { "1": 0, "2": 0, "3": 0 },
            "3": { "1": 0, "2": 0, "3": 0 }
          },
          goalkeeper: {
            "1": { "1": true, "2": false, "3": false },
            "2": { "1": false, "2": false, "3": false },
            "3": { "1": false, "2": false, "3": false }
          },
          isLateArrival: false
        }
      }

      const expectedConflicts = [
        {
          section: 1,
          part: 1,
          existingGoalkeeperId: 'player-1',
          existingGoalkeeperName: 'Player 1',
          newGoalkeeperId: 'player-2',
          newGoalkeeperName: 'Player 2'
        }
      ]

      jest.spyOn(service, 'validateAttendanceData').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        conflicts: expectedConflicts
      })

      const result = await service.previewGoalkeeperConflicts('match-1', attendanceData)

      expect(result).toEqual(expectedConflicts)
      expect(service.validateAttendanceData).toHaveBeenCalledWith('match-1', attendanceData)
    })
  })
})