import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { toast } from 'sonner'
import {
  type MatchInfo,
  type Player,
  type AttendanceGrid,
  type FeeCalculations,
  type FeeOverrides,
  type AttendanceStats,
  type AttendanceDataItem,
  matchInfoSchema,
  attendanceGridSchema,
} from '@/lib/validations/match'
import { calculateCoefficient } from '@/lib/utils/coefficient'

// Store State Interface
interface MatchStoreState {
  // Core Data
  matchInfo: MatchInfo | null
  selectedPlayers: Player[]
  availablePlayers: Player[]
  attendanceData: AttendanceGrid
  feeData: FeeCalculations
  feeOverrides: FeeOverrides

  // UI State
  isDirty: {
    info: boolean
    players: boolean
    attendance: boolean
    fees: boolean
  }
  isLoading: {
    match: boolean
    players: boolean
    attendance: boolean
    fees: boolean
    saving: boolean
  }
  errors: Record<string, string>
}

// Store Actions Interface
interface MatchStoreActions {
  // Data Loading Actions
  loadMatch: (matchId: string) => Promise<void>
  loadPlayers: (matchId: string) => Promise<void>
  loadAvailablePlayers: (matchId: string) => Promise<void>
  loadAttendance: (matchId: string) => Promise<void>
  loadFees: (matchId: string) => Promise<void>

  // Data Update Actions
  updateMatchInfo: (info: Partial<MatchInfo>) => void
  setSelectedPlayers: (players: Player[]) => void
  updateAttendance: (data: AttendanceGrid) => void
  updateAttendanceItem: (userId: string, section: number, part: number, updates: Partial<AttendanceDataItem>) => void
  setFeeOverride: (userId: string, override: Partial<FeeOverrides[string]>) => void
  removeFeeOverride: (userId: string) => void

  // Save Actions
  saveMatchInfo: () => Promise<void>
  saveSelectedPlayers: () => Promise<void>
  saveAttendance: () => Promise<void>
  saveFees: () => Promise<void>
  saveAll: () => Promise<void>

  // Computed Getters
  getCalculatedFees: () => FeeCalculations
  getTotalParticipants: () => number
  getAttendanceStats: () => AttendanceStats
  hasUnsavedChanges: (section?: keyof MatchStoreState['isDirty']) => boolean

  // Utility Actions
  resetDirtyState: (section?: keyof MatchStoreState['isDirty']) => void
  clearErrors: () => void
  setError: (key: string, message: string) => void
}

type MatchStore = MatchStoreState & MatchStoreActions

// Initial State
const initialState: MatchStoreState = {
  matchInfo: null,
  selectedPlayers: [],
  availablePlayers: [],
  attendanceData: [],
  feeData: [],
  feeOverrides: {},
  
  isDirty: {
    info: false,
    players: false,
    attendance: false,
    fees: false,
  },
  
  isLoading: {
    match: false,
    players: false,
    attendance: false,
    fees: false,
    saving: false,
  },
  
  errors: {},
}

export const useMatchStore = create<MatchStore>()(
  devtools((set, get) => ({
    ...initialState,

    // Load match data
    loadMatch: async (matchId: string) => {
      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, match: true },
        errors: {}
      }))

      try {
        const response = await fetch(`/api/games/${matchId}`)
        const data = await response.json()

        if (data.success) {
          const validatedMatch = matchInfoSchema.parse(data.data)
          set(state => ({
            ...state,
            matchInfo: validatedMatch,
            isLoading: { ...state.isLoading, match: false },
            isDirty: { ...state.isDirty, info: false }
          }))
        } else {
          throw new Error(data.error?.message || 'Failed to load match')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load match'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, match: false },
          errors: { ...state.errors, match: message }
        }))
        toast.error(message)
        throw error
      }
    },

    // Load players for a specific match
    loadPlayers: async (matchId: string) => {
      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, players: true }
      }))

      try {
        const response = await fetch(`/api/admin/matches/${matchId}/players`)
        const data = await response.json()

        if (data.success) {
          set(state => ({
            ...state,
            selectedPlayers: data.data.selectedPlayers || [],
            availablePlayers: data.data.allPlayers || [],
            isLoading: { ...state.isLoading, players: false },
            isDirty: { ...state.isDirty, players: false }
          }))
        } else {
          throw new Error(data.error?.message || 'Failed to load players')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load players'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, players: false },
          errors: { ...state.errors, players: message }
        }))
        toast.error(message)
      }
    },

    // Load available players (separate from selected players loading)
    loadAvailablePlayers: async (matchId: string) => {
      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, players: true }
      }))

      try {
        const response = await fetch(`/api/admin/matches/${matchId}/players`)
        const data = await response.json()

        if (data.success) {
          set(state => ({
            ...state,
            availablePlayers: data.data.allPlayers || [],
            isLoading: { ...state.isLoading, players: false }
          }))
        } else {
          throw new Error(data.error?.message || 'Failed to load available players')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load available players'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, players: false },
          errors: { ...state.errors, players: message }
        }))
        toast.error(message)
      }
    },

    // Load attendance data
    loadAttendance: async (matchId: string) => {
      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, attendance: true }
      }))

      try {
        const response = await fetch(`/api/admin/matches/${matchId}/attendance`)
        const data = await response.json()

        if (data.success && data.data) {
          // Transform the new API response format back to our internal format
          const attendanceArray: any[] = []
          
          // Get selected players for filtering
          const selectedPlayerIds = new Set(data.data.selectedPlayers || [])
          
          // Check if we have attendance data
          if (data.data.attendanceData && Object.keys(data.data.attendanceData).length > 0) {
            Object.entries(data.data.attendanceData).forEach(([userId, userData]: [string, any]) => {
              // Skip users not in selected players list
              if (!selectedPlayerIds.has(userId)) {
                return
              }
              const { attendance, goalkeeper, isLateArrival } = userData
              
              // Get events for this user
              const userEvents = data.data.eventsSummary?.[userId] || { goals: 0, assists: 0 }
              
              // Convert back to grid format - include ALL cells for complete data structure
              for (let section = 1; section <= 3; section++) {
                for (let part = 1; part <= 3; part++) {
                  const sectionStr = section.toString()
                  const partStr = part.toString()
                  
                  // Access the attendance structure correctly
                  const value = attendance?.[sectionStr]?.[partStr] || 0
                  const isGoalkeeper = goalkeeper?.[sectionStr]?.[partStr] || false
                  
                  // Include ALL cells to maintain complete data structure
                  attendanceArray.push({
                    userId,
                    section,
                    part,
                    value,
                    isGoalkeeper,
                    isLateArrival: isLateArrival || false,
                    // Only show goals/assists on first cell to avoid duplication
                    goals: section === 1 && part === 1 ? userEvents.goals : 0,
                    assists: section === 1 && part === 1 ? userEvents.assists : 0,
                  })
                }
              }
            })
          }
          
          const validatedAttendance = attendanceGridSchema.parse(attendanceArray)
          set(state => ({
            ...state,
            attendanceData: validatedAttendance,
            isLoading: { ...state.isLoading, attendance: false },
            isDirty: { ...state.isDirty, attendance: false }
          }))
        } else {
          set(state => ({
            ...state,
            attendanceData: [],
            isLoading: { ...state.isLoading, attendance: false },
            isDirty: { ...state.isDirty, attendance: false }
          }))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load attendance'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, attendance: false },
          errors: { ...state.errors, attendance: message }
        }))
      }
    },

    // Load fee data from API
    loadFees: async (matchId: string) => {
      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, fees: true }
      }))

      try {
        const response = await fetch(`/api/admin/matches/${matchId}/fees`)
        const data = await response.json()

        if (data.success) {
          // Transform API response to match our FeeCalculations format
          const feeCalculations = data.data.players || []
          set(state => ({
            ...state,
            feeData: feeCalculations,
            isLoading: { ...state.isLoading, fees: false },
            isDirty: { ...state.isDirty, fees: false }
          }))
        } else {
          throw new Error(data.error?.message || 'Failed to load fees')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load fees'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, fees: false },
          errors: { ...state.errors, fees: message }
        }))
        toast.error(message)
      }
    },

    // Update match info (optimistic update)
    updateMatchInfo: (info: Partial<MatchInfo>) => {
      set(state => {
        if (state.matchInfo) {
          return {
            ...state,
            matchInfo: { ...state.matchInfo, ...info },
            isDirty: { ...state.isDirty, info: true }
          }
        }
        return state
      })
    },

    // Set selected players (with attendance cleanup)
    setSelectedPlayers: (players: Player[]) => {
      set(state => {
        const newSelectedPlayerIds = new Set(players.map(p => p.id))
        
        // Filter out attendance data for players no longer selected
        const cleanedAttendanceData = state.attendanceData.filter(attendance => 
          newSelectedPlayerIds.has(attendance.userId)
        )
        
        return {
          ...state,
          selectedPlayers: players,
          attendanceData: cleanedAttendanceData,
          isDirty: { 
            ...state.isDirty, 
            players: true,
            // Mark attendance as dirty if we removed any data
            attendance: cleanedAttendanceData.length !== state.attendanceData.length ? true : state.isDirty.attendance
          }
        }
      })
    },

    // Update attendance data
    updateAttendance: (data: AttendanceGrid) => {
      set(state => ({
        ...state,
        attendanceData: data,
        isDirty: { ...state.isDirty, attendance: true }
      }))
    },

    // Update single attendance item
    updateAttendanceItem: (userId: string, section: number, part: number, updates: Partial<AttendanceDataItem>) => {
      set(state => {
        const newAttendanceData = [...state.attendanceData]
        const existingIndex = newAttendanceData.findIndex(
          item => item.userId === userId && item.section === section && item.part === part
        )

        if (existingIndex >= 0) {
          newAttendanceData[existingIndex] = { ...newAttendanceData[existingIndex], ...updates }
        } else {
          newAttendanceData.push({
            userId,
            section,
            part,
            value: 0,
            isGoalkeeper: false,
            isLateArrival: false,
            goals: 0,
            assists: 0,
            ...updates,
          })
        }

        return {
          ...state,
          attendanceData: newAttendanceData,
          isDirty: { ...state.isDirty, attendance: true }
        }
      })
    },

    // Set fee override
    setFeeOverride: (userId: string, override: Partial<FeeOverrides[string]>) => {
      set(state => ({
        ...state,
        feeOverrides: {
          ...state.feeOverrides,
          [userId]: { ...state.feeOverrides[userId], ...override, userId }
        },
        isDirty: { ...state.isDirty, fees: true }
      }))
    },

    // Remove fee override
    removeFeeOverride: (userId: string) => {
      set(state => {
        const newOverrides = { ...state.feeOverrides }
        delete newOverrides[userId]
        return {
          ...state,
          feeOverrides: newOverrides,
          isDirty: { ...state.isDirty, fees: true }
        }
      })
    },

    // Save match info
    saveMatchInfo: async () => {
      const { matchInfo } = get()
      if (!matchInfo) return

      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, saving: true }
      }))

      try {
        // Transform data to ensure proper types before sending
        const transformedMatchInfo = {
          opponentTeam: matchInfo.opponentTeam,
          matchDate: matchInfo.matchDate, // Already in ISO format from database
          matchTime: matchInfo.matchTime || null, // Already transformed to ISO string in component
          ourScore: matchInfo.ourScore === '' || matchInfo.ourScore === undefined || matchInfo.ourScore === null ? null : Number(matchInfo.ourScore),
          opponentScore: matchInfo.opponentScore === '' || matchInfo.opponentScore === undefined || matchInfo.opponentScore === null ? null : Number(matchInfo.opponentScore),
          fieldFeeTotal: Number(matchInfo.fieldFeeTotal),
          waterFeeTotal: Number(matchInfo.waterFeeTotal),
          notes: matchInfo.notes || null
        }

        const response = await fetch(`/api/admin/matches/${matchInfo.id}/info`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transformedMatchInfo)
        })

        const data = await response.json()

        if (data.success) {
          set(state => ({
            ...state,
            isDirty: { ...state.isDirty, info: false },
            isLoading: { ...state.isLoading, saving: false }
          }))

          // If fees were recalculated due to field/water fee changes, reload fee data
          if (data.data.feeRecalculation?.recalculated) {
            await get().loadFees(matchInfo.id)
            toast.success(`比赛信息保存成功！费用已自动重新计算 (${data.data.feeRecalculation.totalParticipants} 名参与者)`)
          } else {
            toast.success('比赛信息保存成功')
          }
        } else {
          // Handle validation errors specifically
          if (data.error?.code === 'VALIDATION_ERROR' && data.error?.details) {
            const validationErrors = data.error.details.map((err: any) => `${err.path}: ${err.message}`).join('; ')
            throw new Error(`数据验证失败: ${validationErrors}`)
          }
          throw new Error(data.error?.message || 'Failed to save match info')
        }
      } catch (error) {
        let message = '保存比赛信息失败'
        
        if (error instanceof Error) {
          message = error.message
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
          message = String(error.message)
        }
        
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, saving: false },
          errors: { ...state.errors, info: message }
        }))
        toast.error(message)
        console.error('Match info save error:', error)
        throw error
      }
    },

    // Save selected players
    saveSelectedPlayers: async () => {
      const { matchInfo, selectedPlayers } = get()
      if (!matchInfo) return

      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, saving: true }
      }))

      try {
        const response = await fetch(`/api/admin/matches/${matchInfo.id}/players`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerIds: selectedPlayers.map(p => p.id)
          })
        })

        const data = await response.json()

        if (data.success) {
          set(state => ({
            ...state,
            isDirty: { ...state.isDirty, players: false },
            isLoading: { ...state.isLoading, saving: false }
          }))
          toast.success(`选中球员保存成功！已选择 ${data.data.count} 名球员`)
        } else {
          throw new Error(data.error?.message || 'Failed to save selected players')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save selected players'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, saving: false },
          errors: { ...state.errors, players: message }
        }))
        toast.error(message)
        throw error
      }
    },

    // Save attendance
    saveAttendance: async () => {
      const { matchInfo, attendanceData, selectedPlayers } = get()
      if (!matchInfo) return

      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, saving: true }
      }))

      try {
        // Transform attendance data to the new API format
        const transformedData: Record<string, any> = {}
        const events: Array<{ playerId: string, eventType: 'GOAL' | 'ASSIST', count: number }> = []

        // Create a set of selected player IDs for quick lookup
        const selectedPlayerIds = new Set(selectedPlayers.map(p => p.id))

        // Group attendance data by user - ONLY for selected players
        const userAttendanceMap = new Map<string, any>()

        attendanceData.forEach(item => {
          // Skip if player is not selected
          if (!selectedPlayerIds.has(item.userId)) {
            return
          }
          if (!userAttendanceMap.has(item.userId)) {
            userAttendanceMap.set(item.userId, {
              attendance: {
                "1": {"1": 0, "2": 0, "3": 0},
                "2": {"1": 0, "2": 0, "3": 0},
                "3": {"1": 0, "2": 0, "3": 0}
              },
              goalkeeper: {
                "1": {"1": false, "2": false, "3": false},
                "2": {"1": false, "2": false, "3": false},
                "3": {"1": false, "2": false, "3": false}
              },
              isLateArrival: false,
              goals: 0,
              assists: 0
            })
          }

          const userData = userAttendanceMap.get(item.userId)!
          
          // Set attendance value
          userData.attendance[item.section.toString()][item.part.toString()] = item.value
          
          // Set goalkeeper status
          if (item.isGoalkeeper) {
            userData.goalkeeper[item.section.toString()][item.part.toString()] = true
          }
          
          // Set late arrival
          if (item.isLateArrival) {
            userData.isLateArrival = true
          }
          
          // Aggregate goals and assists (take max to avoid duplicates)
          userData.goals = Math.max(userData.goals, item.goals)
          userData.assists = Math.max(userData.assists, item.assists)
        })

        // Convert to the expected format and collect events
        userAttendanceMap.forEach((userData, userId) => {
          transformedData[userId] = {
            attendance: userData.attendance,
            goalkeeper: userData.goalkeeper,
            isLateArrival: userData.isLateArrival
          }

          // Add events if there are any
          if (userData.goals > 0) {
            events.push({
              playerId: userId,
              eventType: 'GOAL',
              count: userData.goals
            })
          }
          
          if (userData.assists > 0) {
            events.push({
              playerId: userId,
              eventType: 'ASSIST',
              count: userData.assists
            })
          }
        })

        const response = await fetch(`/api/admin/matches/${matchInfo.id}/attendance`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendanceData: transformedData,
            events: events,
            matchInfo: {
              fieldFeeTotal: matchInfo.fieldFeeTotal,
              waterFeeTotal: matchInfo.waterFeeTotal
            },
            selectedPlayerIds: selectedPlayers.map(p => p.id)
          }),
        })

        const data = await response.json()

        if (data.success) {
          set(state => ({
            ...state,
            isDirty: { ...state.isDirty, attendance: false },
            isLoading: { ...state.isLoading, saving: false }
          }))
          
          // Reload fees since attendance data changed (affects fee calculations)
          await get().loadFees(matchInfo.id)
          
          toast.success(`出勤数据保存成功！保存了 ${data.data.participationsCount} 名参与者，${data.data.eventsCount} 个事件，费用已自动更新`)
        } else {
          throw new Error(data.error?.message || 'Failed to save attendance')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save attendance'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, saving: false },
          errors: { ...state.errors, attendance: message }
        }))
        toast.error(message)
        throw error
      }
    },

    // Save fees (placeholder)
    saveFees: async () => {
      const { matchInfo, feeOverrides } = get()
      if (!matchInfo) return

      set(state => ({
        ...state,
        isLoading: { ...state.isLoading, saving: true }
      }))

      try {
        const manualOverrides = Object.entries(feeOverrides).reduce(
          (acc, [playerId, override]) => {
            const payload: {
              fieldFeeOverride?: number | null
              videoFeeOverride?: number | null
              lateFeeOverride?: number | null
              notes?: string | null
            } = {}

            if (override.fieldFee !== undefined) payload.fieldFeeOverride = override.fieldFee
            if (override.videoFee !== undefined) payload.videoFeeOverride = override.videoFee
            if (override.lateFee !== undefined) payload.lateFeeOverride = override.lateFee
            if (override.notes !== undefined) payload.notes = override.notes

            if (Object.keys(payload).length > 0) {
              acc[playerId] = payload
            }
            return acc
          },
          {} as Record<string, {
            fieldFeeOverride?: number | null
            videoFeeOverride?: number | null
            lateFeeOverride?: number | null
            notes?: string | null
          }>
        )

        const response = await fetch(`/api/admin/matches/${matchInfo.id}/fees`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manualOverrides })
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error?.message || 'Failed to save fees')
        }

        await get().loadFees(matchInfo.id)
        
        set(state => ({
          ...state,
          isDirty: { ...state.isDirty, fees: false },
          isLoading: { ...state.isLoading, saving: false }
        }))
        toast.success('费用设置保存成功')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save fees'
        set(state => ({
          ...state,
          isLoading: { ...state.isLoading, saving: false },
          errors: { ...state.errors, fees: message }
        }))
        toast.error(message)
        throw error
      }
    },

    // Save all changes
    saveAll: async () => {
      const { isDirty } = get()
      const promises: Promise<void>[] = []

      if (isDirty.info) promises.push(get().saveMatchInfo())
      if (isDirty.players) promises.push(get().saveSelectedPlayers())
      if (isDirty.attendance) promises.push(get().saveAttendance())
      if (isDirty.fees) promises.push(get().saveFees())

      if (promises.length === 0) {
        toast.success('没有需要保存的更改')
        return
      }

      try {
        await Promise.all(promises)
        toast.success('所有更改保存成功')
      } catch (error) {
        toast.error('保存时发生错误')
        throw error
      }
    },

    // Computed: Get calculated fees (now API-driven)
    getCalculatedFees: () => {
      // Return cached fee data from state (populated by API calls)
      // This eliminates client-side calculation entirely
      return get().feeData
    },

    // Computed: Get total participants
    getTotalParticipants: () => {
      const { attendanceData } = get()
      return new Set(attendanceData.filter(a => a.value > 0).map(a => a.userId)).size
    },

    // Computed: Get attendance stats
    getAttendanceStats: () => {
      const { attendanceData } = get()
      
      const stats: AttendanceStats = {
        totalParticipants: new Set(attendanceData.filter(a => a.value > 0).map(a => a.userId)).size,
        totalGoals: attendanceData.reduce((sum, a) => sum + a.goals, 0),
        totalAssists: attendanceData.reduce((sum, a) => sum + a.assists, 0),
        averageAttendance: attendanceData.length > 0 ? attendanceData.reduce((sum, a) => sum + a.value, 0) / attendanceData.length : 0,
        goalkeeperCount: attendanceData.filter(a => a.isGoalkeeper).length,
        lateArrivals: new Set(attendanceData.filter(a => a.isLateArrival).map(a => a.userId)).size,
      }

      return stats
    },

    // Check for unsaved changes
    hasUnsavedChanges: (section?: keyof MatchStoreState['isDirty']) => {
      const { isDirty } = get()
      if (section) {
        return isDirty[section]
      }
      return Object.values(isDirty).some(Boolean)
    },

    // Reset dirty state
    resetDirtyState: (section?: keyof MatchStoreState['isDirty']) => {
      set(state => {
        if (section) {
          return {
            ...state,
            isDirty: { ...state.isDirty, [section]: false }
          }
        } else {
          return {
            ...state,
            isDirty: {
              info: false,
              players: false,
              attendance: false,
              fees: false,
            }
          }
        }
      })
    },

    // Clear errors
    clearErrors: () => {
      set(state => ({
        ...state,
        errors: {}
      }))
    },

    // Set error
    setError: (key: string, message: string) => {
      set(state => ({
        ...state,
        errors: { ...state.errors, [key]: message }
      }))
    },
  }), { name: 'match-store' })
)

// Selector hooks for optimized re-renders
export const useMatchInfo = () => useMatchStore(state => state.matchInfo)
export const useSelectedPlayers = () => useMatchStore(state => state.selectedPlayers)
export const useAvailablePlayers = () => useMatchStore(state => state.availablePlayers)
export const useAttendanceData = () => useMatchStore(state => state.attendanceData)
export const useFeeData = () => useMatchStore(state => state.feeData)
export const useIsDirty = () => useMatchStore(state => state.isDirty)
export const useIsLoading = () => useMatchStore(state => state.isLoading)
export const useErrors = () => useMatchStore(state => state.errors)

// Action selectors - individual exports to avoid infinite loops
export const useLoadMatch = () => useMatchStore(state => state.loadMatch)
export const useLoadPlayers = () => useMatchStore(state => state.loadPlayers)
export const useLoadAvailablePlayers = () => useMatchStore(state => state.loadAvailablePlayers)
export const useLoadAttendance = () => useMatchStore(state => state.loadAttendance)
export const useLoadFees = () => useMatchStore(state => state.loadFees)
export const useUpdateMatchInfo = () => useMatchStore(state => state.updateMatchInfo)
export const useSetSelectedPlayers = () => useMatchStore(state => state.setSelectedPlayers)
export const useUpdateAttendance = () => useMatchStore(state => state.updateAttendance)
export const useUpdateAttendanceItem = () => useMatchStore(state => state.updateAttendanceItem)
export const useSetFeeOverride = () => useMatchStore(state => state.setFeeOverride)
export const useRemoveFeeOverride = () => useMatchStore(state => state.removeFeeOverride)
export const useSaveMatchInfo = () => useMatchStore(state => state.saveMatchInfo)
export const useSaveSelectedPlayers = () => useMatchStore(state => state.saveSelectedPlayers)
export const useSaveAttendance = () => useMatchStore(state => state.saveAttendance)
export const useSaveFees = () => useMatchStore(state => state.saveFees)
export const useSaveAll = () => useMatchStore(state => state.saveAll)
export const useGetCalculatedFees = () => useMatchStore(state => state.getCalculatedFees)
export const useGetTotalParticipants = () => useMatchStore(state => state.getTotalParticipants)
export const useGetAttendanceStats = () => useMatchStore(state => state.getAttendanceStats)
export const useHasUnsavedChanges = () => useMatchStore(state => state.hasUnsavedChanges)
export const useResetDirtyState = () => useMatchStore(state => state.resetDirtyState)
export const useClearErrors = () => useMatchStore(state => state.clearErrors)
export const useSetError = () => useMatchStore(state => state.setError)
