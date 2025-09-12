import { User, AttendanceData } from '@/types'
import { 
  PositionCategory, 
  getPositionCategory, 
  isValidPosition, 
  POSITION_CATEGORIES 
} from './position-mapping'

export interface PlayerPositionStats {
  userId: string
  name: string
  position: string
  positionCategory: PositionCategory
  totalTime: number
  goals: number
  assists: number
  isGoalkeeper: boolean
  isLate: boolean
}

export interface PositionCategoryStats {
  category: PositionCategory
  displayName: string
  players: PlayerPositionStats[]
  totalPlayers: number
  totalTime: number
  totalGoals: number
  totalAssists: number
  averageTime: number
}

export type SortOrder = 'asc' | 'desc'

/**
 * Transform attendance and user data into position-based statistics
 */
export function generatePositionStatistics(
  users: User[], 
  attendance: AttendanceData[]
): PositionCategoryStats[] {
  // First, aggregate stats by player
  const playerStatsMap = new Map<string, PlayerPositionStats>()
  
  // Process all attendance records, including those with zero play time
  attendance.forEach(a => {
    const user = users.find(u => u.id === a.userId)
    
    if (!user?.position || !isValidPosition(user.position)) {
      // Skip players with unrecognized positions
      return
    }
    
    const positionCategory = getPositionCategory(user.position)
    if (!positionCategory) return
    
    const existing = playerStatsMap.get(a.userId)
    
    if (existing) {
      // Only add play time if they actually played
      if (a.value > 0) {
        existing.totalTime += a.value
      }
      existing.goals = Math.max(existing.goals, a.goals)
      existing.assists = Math.max(existing.assists, a.assists)
      existing.isGoalkeeper = existing.isGoalkeeper || a.isGoalkeeper
      existing.isLate = existing.isLate || a.isLateArrival
    } else {
      playerStatsMap.set(a.userId, {
        userId: a.userId,
        name: user?.name || 'Unknown',
        position: user?.position || '',
        positionCategory,
        totalTime: a.value > 0 ? a.value : 0, // Include players with 0 play time
        goals: a.goals,
        assists: a.assists,
        isGoalkeeper: a.isGoalkeeper,
        isLate: a.isLateArrival
      })
    }
  })
  
  // Also include users who have valid positions but no attendance data yet
  users.forEach(user => {
    if (user.position && isValidPosition(user.position) && !playerStatsMap.has(user.id)) {
      const positionCategory = getPositionCategory(user.position)
      if (positionCategory) {
        playerStatsMap.set(user.id, {
          userId: user.id,
          name: user.name || 'Unknown',
          position: user.position,
          positionCategory,
          totalTime: 0,
          goals: 0,
          assists: 0,
          isGoalkeeper: false,
          isLate: false
        })
      }
    }
  })
  
  const allPlayerStats = Array.from(playerStatsMap.values())
  
  // Group players by position category
  const categoryStats: PositionCategoryStats[] = POSITION_CATEGORIES.map(category => {
    const categoryPlayers = allPlayerStats.filter(p => p.positionCategory === category)
    const playingPlayers = categoryPlayers.filter(p => p.totalTime > 0)
    
    const totalTime = categoryPlayers.reduce((sum, p) => sum + p.totalTime, 0)
    const totalGoals = categoryPlayers.reduce((sum, p) => sum + p.goals, 0)
    const totalAssists = categoryPlayers.reduce((sum, p) => sum + p.assists, 0)
    
    return {
      category,
      displayName: getCategoryDisplayName(category),
      players: categoryPlayers.sort((a, b) => b.totalTime - a.totalTime), // Default sort by time desc
      totalPlayers: categoryPlayers.length,
      totalTime,
      totalGoals,
      totalAssists,
      averageTime: playingPlayers.length > 0 ? 
        Math.round((totalTime / playingPlayers.length) * 100) / 100 : 0
    }
  }).filter(category => category.totalPlayers > 0) // Only show categories with players
  
  return categoryStats
}

/**
 * Sort players within a position category
 */
export function sortPlayersByTime(
  players: PlayerPositionStats[], 
  order: SortOrder
): PlayerPositionStats[] {
  return [...players].sort((a, b) => {
    if (order === 'asc') {
      return a.totalTime - b.totalTime
    }
    return b.totalTime - a.totalTime
  })
}

/**
 * Get display name for position category
 */
function getCategoryDisplayName(category: PositionCategory): string {
  switch (category) {
    case 'GK': return '门将'
    case '后卫': return '后卫'
    case '中场': return '中场'
    case '前锋': return '前锋'
    default: return category
  }
}

/**
 * Group players by their specific positions within a category
 */
export function groupPlayersBySpecificPosition(
  players: PlayerPositionStats[]
): Record<string, PlayerPositionStats[]> {
  const grouped: Record<string, PlayerPositionStats[]> = {}
  
  players.forEach(player => {
    const position = player.position.toUpperCase()
    if (!grouped[position]) {
      grouped[position] = []
    }
    grouped[position].push(player)
  })
  
  return grouped
}