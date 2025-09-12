'use client'

import { useMemo } from 'react'
import { Users, Target, Award, Shield, Timer, TrendingUp } from 'lucide-react'
import { Match, User, AttendanceData } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generatePositionStatistics, PlayerPositionStats } from '@/lib/utils/position-statistics'
import { getPositionCategory } from '@/lib/utils/position-mapping'
import PositionCard from './PositionCard'

interface StatisticsTabProps {
  match: Match
  users: User[]
  attendance: AttendanceData[]
}


export default function StatisticsTab({ match, users, attendance }: StatisticsTabProps) {
  const { stats, positionStats } = useMemo(() => {
    // Aggregate stats by player
    const playerStatsMap = new Map<string, PlayerPositionStats>()

    // Process all attendance records, including those with zero play time
    attendance.forEach(a => {
      const user = users.find(u => u.id === a.userId)
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
        const positionCategory = getPositionCategory(user?.position)
        if (positionCategory) {
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
      }
    })
    
    // Also include users who have valid positions but no attendance data yet
    users.forEach(user => {
      if (user.position && getPositionCategory(user.position) && !playerStatsMap.has(user.id)) {
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
    
    const playerStats = Array.from(playerStatsMap.values())
    
    // Filter players who actually participated (totalTime > 0) for main statistics
    const participatingPlayers = playerStats.filter(p => p.totalTime > 0)
    
    const stats = {
      totalParticipants: participatingPlayers.length,
      totalGoals: playerStats.reduce((sum, p) => sum + p.goals, 0),
      totalAssists: playerStats.reduce((sum, p) => sum + p.assists, 0),
      totalGoalkeepers: playerStats.filter(p => p.isGoalkeeper).length,
      totalLateArrivals: playerStats.filter(p => p.isLate).length,
      totalPlayingTime: playerStats.reduce((sum, p) => sum + p.totalTime, 0),
      averagePlayingTime: participatingPlayers.length > 0 ? 
        Math.round((playerStats.reduce((sum, p) => sum + p.totalTime, 0) / participatingPlayers.length) * 100) / 100 : 0,
      topScorer: playerStats.sort((a, b) => b.goals - a.goals)[0] || null,
      topAssist: playerStats.sort((a, b) => b.assists - a.assists)[0] || null,
      playerStats: playerStats.sort((a, b) => b.totalTime - a.totalTime)
    }
    
    // Generate position-based statistics
    const positionStats = generatePositionStatistics(users, attendance)
    
    return { stats, positionStats }
  }, [attendance, users])

  const getMatchResult = () => {
    if (match.ourScore !== null && match.ourScore !== undefined && 
        match.opponentScore !== null && match.opponentScore !== undefined) {
      if (match.ourScore > match.opponentScore) return { text: '胜利', type: 'win' }
      if (match.ourScore < match.opponentScore) return { text: '失败', type: 'lose' }
      return { text: '平局', type: 'draw' }
    }
    return null
  }

  const result = getMatchResult()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold">比赛统计</h3>
        <p className="text-muted-foreground">基于实际出勤数据自动计算</p>
      </div>

      {/* Position-based Statistics - MOVED TO TOP */}
      {positionStats.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xl font-semibold">位置统计</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {positionStats.map(categoryStats => (
              <PositionCard 
                key={categoryStats.category}
                categoryStats={categoryStats}
              />
            ))}
          </div>
        </div>
      )}

      {result && (
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-4xl font-bold">{match.ourScore}</span>
              <span className="text-2xl text-muted-foreground">:</span>
              <span className="text-4xl font-bold">{match.opponentScore}</span>
            </div>
            <Badge 
              variant={result.type === 'win' ? 'default' : result.type === 'lose' ? 'destructive' : 'secondary'}
              className="text-lg px-4 py-1"
            >
              {result.text}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <div className="text-sm text-muted-foreground">参与人数</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-4">
            <Target className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalGoals}</div>
            <div className="text-sm text-muted-foreground">总进球</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-4">
            <Award className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalAssists}</div>
            <div className="text-sm text-muted-foreground">总助攻</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-4">
            <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalGoalkeepers}</div>
            <div className="text-sm text-muted-foreground">门将人数</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-4">
            <Timer className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalLateArrivals}</div>
            <div className="text-sm text-muted-foreground">迟到人数</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-4">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.averagePlayingTime}</div>
            <div className="text-sm text-muted-foreground">平均出勤时长</div>
          </CardContent>
        </Card>
      </div>

      {stats.topScorer && stats.topScorer.goals > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>本场最佳</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.topScorer.goals > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">最佳射手</div>
                    <div className="font-medium">
                      {stats.topScorer.name} ({stats.topScorer.goals} 球)
                    </div>
                  </div>
                </div>
              )}
              
              {stats.topAssist && stats.topAssist.assists > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Award className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">助攻王</div>
                    <div className="font-medium">
                      {stats.topAssist.name} ({stats.topAssist.assists} 次)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}