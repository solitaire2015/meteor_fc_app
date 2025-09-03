'use client'

import { useMemo } from 'react'
import { Users, Target, Award, Shield, Timer, TrendingUp } from 'lucide-react'
import { Match, User, AttendanceData } from '@/types'
import styles from './StatisticsTab.module.css'

interface StatisticsTabProps {
  match: Match
  users: User[]
  attendance: AttendanceData[]
}

interface PlayerStats {
  userId: string
  name: string
  totalTime: number
  goals: number
  assists: number
  isGoalkeeper: boolean
  isLate: boolean
}

export default function StatisticsTab({ match, users, attendance }: StatisticsTabProps) {
  const stats = useMemo(() => {
    // Aggregate stats by player
    const playerStatsMap = new Map<string, PlayerStats>()
    
    attendance.forEach(a => {
      if (a.value > 0) {
        const existing = playerStatsMap.get(a.userId)
        const user = users.find(u => u.id === a.userId)
        
        if (existing) {
          existing.totalTime += a.value
          existing.goals = Math.max(existing.goals, a.goals)
          existing.assists = Math.max(existing.assists, a.assists)
          existing.isGoalkeeper = existing.isGoalkeeper || a.isGoalkeeper
          existing.isLate = existing.isLate || a.isLateArrival
        } else {
          playerStatsMap.set(a.userId, {
            userId: a.userId,
            name: user?.name || 'Unknown',
            totalTime: a.value,
            goals: a.goals,
            assists: a.assists,
            isGoalkeeper: a.isGoalkeeper,
            isLate: a.isLateArrival
          })
        }
      }
    })
    
    const playerStats = Array.from(playerStatsMap.values())
    
    return {
      totalParticipants: playerStats.length,
      totalGoals: playerStats.reduce((sum, p) => sum + p.goals, 0),
      totalAssists: playerStats.reduce((sum, p) => sum + p.assists, 0),
      totalGoalkeepers: playerStats.filter(p => p.isGoalkeeper).length,
      totalLateArrivals: playerStats.filter(p => p.isLate).length,
      totalPlayingTime: playerStats.reduce((sum, p) => sum + p.totalTime, 0),
      averagePlayingTime: playerStats.length > 0 ? 
        Math.round((playerStats.reduce((sum, p) => sum + p.totalTime, 0) / playerStats.length) * 100) / 100 : 0,
      topScorer: playerStats.sort((a, b) => b.goals - a.goals)[0] || null,
      topAssist: playerStats.sort((a, b) => b.assists - a.assists)[0] || null,
      playerStats: playerStats.sort((a, b) => b.totalTime - a.totalTime)
    }
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>比赛统计</h3>
        <p className={styles.subtitle}>基于实际出勤数据自动计算</p>
      </div>

      {result && (
        <div className={styles.matchResult}>
          <div className={styles.scoreDisplay}>
            <span className={styles.ourScore}>{match.ourScore}</span>
            <span className={styles.vs}>:</span>
            <span className={styles.opponentScore}>{match.opponentScore}</span>
          </div>
          <div className={`${styles.resultText} ${styles[result.type]}`}>
            {result.text}
          </div>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalParticipants}</div>
            <div className={styles.statLabel}>参与人数</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Target size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalGoals}</div>
            <div className={styles.statLabel}>总进球</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Award size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalAssists}</div>
            <div className={styles.statLabel}>总助攻</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Shield size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalGoalkeepers}</div>
            <div className={styles.statLabel}>门将人数</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Timer size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalLateArrivals}</div>
            <div className={styles.statLabel}>迟到人数</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.averagePlayingTime}</div>
            <div className={styles.statLabel}>平均出勤时长</div>
          </div>
        </div>
      </div>

      {stats.topScorer && stats.topScorer.goals > 0 && (
        <div className={styles.highlights}>
          <h4>本场最佳</h4>
          <div className={styles.highlightCards}>
            {stats.topScorer.goals > 0 && (
              <div className={styles.highlightCard}>
                <div className={styles.highlightIcon}>
                  <Target size={20} />
                </div>
                <div className={styles.highlightContent}>
                  <div className={styles.highlightLabel}>最佳射手</div>
                  <div className={styles.highlightValue}>
                    {stats.topScorer.name} ({stats.topScorer.goals} 球)
                  </div>
                </div>
              </div>
            )}
            
            {stats.topAssist && stats.topAssist.assists > 0 && (
              <div className={styles.highlightCard}>
                <div className={styles.highlightIcon}>
                  <Award size={20} />
                </div>
                <div className={styles.highlightContent}>
                  <div className={styles.highlightLabel}>助攻王</div>
                  <div className={styles.highlightValue}>
                    {stats.topAssist.name} ({stats.topAssist.assists} 次)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {stats.playerStats.length > 0 && (
        <div className={styles.playerList}>
          <h4>球员表现</h4>
          <div className={styles.playerTable}>
            <div className={styles.tableHeader}>
              <div className={styles.playerCol}>球员</div>
              <div className={styles.timeCol}>出勤时长</div>
              <div className={styles.goalsCol}>进球</div>
              <div className={styles.assistsCol}>助攻</div>
              <div className={styles.statusCol}>状态</div>
            </div>
            <div className={styles.tableBody}>
              {stats.playerStats.map(player => (
                <div key={player.userId} className={styles.playerRow}>
                  <div className={styles.playerCol}>
                    <span className={styles.playerName}>{player.name}</span>
                  </div>
                  <div className={styles.timeCol}>{player.totalTime}</div>
                  <div className={styles.goalsCol}>{player.goals}</div>
                  <div className={styles.assistsCol}>{player.assists}</div>
                  <div className={styles.statusCol}>
                    <div className={styles.statusTags}>
                      {player.isGoalkeeper && (
                        <span className={styles.tag + ' ' + styles.goalkeeper}>门将</span>
                      )}
                      {player.isLate && (
                        <span className={styles.tag + ' ' + styles.late}>迟到</span>
                      )}
                      {!player.isGoalkeeper && !player.isLate && (
                        <span className={styles.tag + ' ' + styles.normal}>正常</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}