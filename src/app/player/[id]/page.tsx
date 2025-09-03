'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mulish } from 'next/font/google'
import Link from 'next/link'
import YearSelector from '@/components/shared/YearSelector'
import styles from './player.module.css'

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

interface PlayerData {
  id: string
  name: string
  email?: string
  phone?: string
  jerseyNumber?: number
  position?: string
  abbreviation: string
  createdAt: string
  statistics: {
    goals: number
    assists: number
    appearances: number
    year: number
  }
  latestMatch?: {
    date: string
    opponent: string
    ourScore: number
    opponentScore: number
    result: string
    totalFee: number
  }
  attendanceHistory: Array<{
    matchId: string
    matchDate: string
    opponent: string
    totalTime: number
    totalFee: number
    isLateArrival: boolean
  }>
}

export default function PlayerPage() {
  const params = useParams()
  const router = useRouter()
  const playerId = params.id as string
  
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Year selector state
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  useEffect(() => {
    if (!playerId) return

    const fetchPlayerData = async () => {
      try {
        // Use different loading states for initial load vs year change
        if (playerData) {
          setDataLoading(true)
        } else {
          setLoading(true)
        }
        
        const response = await fetch(`/api/player/${playerId}?year=${selectedYear}`)
        const data = await response.json()

        if (data.success) {
          setPlayerData(data.data)
          setError(null)
        } else {
          setError(data.error?.message || 'Failed to load player data')
        }
      } catch (err) {
        setError('Failed to load player data')
        console.error('Error fetching player data:', err)
      } finally {
        setLoading(false)
        setDataLoading(false)
      }
    }

    fetchPlayerData()
  }, [playerId, selectedYear])

  if (loading) {
    return (
      <div className={`${styles.container} ${mulish.className}`}>
        <div className={styles.mobileView}>
          <div className={styles.loading}>加载中...</div>
        </div>
      </div>
    )
  }

  if (error || !playerData) {
    return (
      <div className={`${styles.container} ${mulish.className}`}>
        <div className={styles.mobileView}>
          <div className={styles.error}>
            <p>{error || '球员信息未找到'}</p>
            <Link href="/(dashboard)/leaderboard" className={styles.backLink}>
              返回排行榜
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const positionMap: { [key: string]: string } = {
    'GK': '门将',
    'DF': '后卫', 
    'MF': '中场',
    'FW': '前锋'
  }

  return (
    <div className={`${styles.container} ${mulish.className}`}>
      <div className={styles.mobileView}>
        <header className={styles.playerHeader}>
          <div className={styles.headerContent}>
            <div className={styles.playerInfo}>
              <h1>{playerData.name}</h1>
              {playerData.jerseyNumber && (
                <p className={styles.number}>#{playerData.jerseyNumber}</p>
              )}
            </div>
            <div className={styles.yearSelector}>
              <YearSelector
                value={selectedYear}
                onChange={setSelectedYear}
                minYear={currentYear - 2}  // Allow 2 years back
                maxYear={currentYear}      // Up to current year
              />
            </div>
          </div>
          <div className={styles.playerIllustration}>
            <div className={styles.avatarLetter}>
              {playerData.abbreviation}
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {dataLoading && (
            <div className={styles.dataLoadingOverlay}>
              <div className={styles.dataLoadingText}>更新中...</div>
            </div>
          )}
          
          <section className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.value}>{playerData.statistics.goals}</div>
              <div className={styles.label}>进球</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.value}>{playerData.statistics.assists}</div>
              <div className={styles.label}>助攻</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.value}>
                {playerData.position ? positionMap[playerData.position] || playerData.position : '-'}
              </div>
              <div className={styles.label}>位置</div>
            </div>
          </section>

          <section className={styles.appearancesSection}>
            <h2 className={styles.sectionTitle}>出场统计</h2>
            <div className={styles.appearanceStats}>
              <div className={styles.appearanceItem}>
                <span className={styles.appearanceLabel}>总出场次数:</span>
                <span className={styles.appearanceValue}>{playerData.statistics.appearances}</span>
              </div>
              <div className={styles.appearanceItem}>
                <span className={styles.appearanceLabel}>统计年份:</span>
                <span className={styles.appearanceValue}>{playerData.statistics.year}年</span>
              </div>
            </div>
          </section>

          {playerData.latestMatch && (
            <section className={styles.latestMatch}>
              <h2 className={styles.sectionTitle}>最近比赛</h2>
              <div className={styles.card}>
                <div className={styles.matchHeader}>
                  最近参与的比赛 - {new Date(playerData.latestMatch.date).toLocaleDateString('zh-CN')}
                </div>
                <div className={styles.matchDetails}>
                  <div className={styles.team}>
                    <div className={styles.logo}>FC</div>
                    <div className={styles.teamName}>Football Club</div>
                  </div>
                  <div className={styles.scoreInfo}>
                    <div className={styles.score}>
                      {playerData.latestMatch.ourScore}-{playerData.latestMatch.opponentScore}
                    </div>
                    <div className={styles.status}>
                      {playerData.latestMatch.result === 'WIN' ? '胜利' : 
                       playerData.latestMatch.result === 'LOSS' ? '失败' : 
                       playerData.latestMatch.result === 'DRAW' ? '平局' : '已结束'}
                    </div>
                  </div>
                  <div className={styles.team}>
                    <div className={styles.logo}>
                      {playerData.latestMatch.opponent.substring(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.teamName}>{playerData.latestMatch.opponent}</div>
                  </div>
                </div>
                <div className={styles.feeInfo}>
                  <span>费用: ¥{playerData.latestMatch.totalFee}</span>
                </div>
              </div>
            </section>
          )}

          <div className={styles.backToLeaderboard}>
            <Link href="/(dashboard)/leaderboard" className={styles.backButton}>
              返回排行榜
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}