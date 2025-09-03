'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Mulish } from 'next/font/google'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import YearSelector from '@/components/shared/YearSelector'
import styles from './Leaderboard.module.css'

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

interface Player {
  id: string | number
  rank?: number
  name: string
  team: string
  goals: number
  assists: number
  initials: string
}

interface ApiPlayer {
  id: string
  rank: number
  name: string
  goals: number
  assists: number
  abbreviation: string
}

const defaultPlayers = [
  {
    id: 1,
    name: "小陶",
    team: "Football Club",
    goals: 31,
    assists: 8,
    initials: "XT"
  },
  {
    id: 2,
    name: "得瑞克",
    team: "Football Club",
    goals: 16,
    assists: 12,
    initials: "DRK"
  },
  {
    id: 3,
    name: "小贾",
    team: "Football Club",
    goals: 11,
    assists: 15,
    initials: "XJ"
  },
  {
    id: 4,
    name: "肖老师",
    team: "Football Club",
    goals: 10,
    assists: 5,
    initials: "XLS"
  },
  {
    id: 5,
    name: "曦哥",
    team: "Football Club",
    goals: 7,
    assists: 9,
    initials: "XG"
  },
  {
    id: 6,
    name: "小马",
    team: "Football Club",
    goals: 6,
    assists: 4,
    initials: "XM"
  },
  {
    id: 7,
    name: "小刘",
    team: "Football Club",
    goals: 5,
    assists: 7,
    initials: "XL"
  },
  {
    id: 8,
    name: "小罗",
    team: "Football Club",
    goals: 4,
    assists: 6,
    initials: "XR"
  },
  {
    id: 9,
    name: "元帅",
    team: "Football Club",
    goals: 4,
    assists: 3,
    initials: "YS"
  },
  {
    id: 10,
    name: "老狼",
    team: "Football Club",
    goals: 3,
    assists: 8,
    initials: "LL"
  },
  {
    id: 11,
    name: "大赵",
    team: "Football Club",
    goals: 3,
    assists: 2,
    initials: "DZ"
  },
  {
    id: 12,
    name: "东辉",
    team: "Football Club",
    goals: 2,
    assists: 11,
    initials: "DH"
  },
  {
    id: 13,
    name: "冷",
    team: "Football Club",
    goals: 2,
    assists: 1,
    initials: "L"
  }
];

export default function Leaderboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [players, setPlayers] = useState(defaultPlayers)
  const [loading, setLoading] = useState(true)
  const tabsRef = useRef(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  
  // Year selector state
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const tabs = ['射手榜', '助攻榜']

  // Fetch leaderboard data
  const fetchLeaderboard = async (type: 'goals' | 'assists') => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leaderboard?type=${type}&year=${selectedYear}`)
      const data = await response.json()
      
      if (data.success) {
        // Transform API data to component format
        const transformedPlayers = data.data.players.map((player: ApiPlayer) => ({
          id: player.id, // Use actual player ID for navigation
          rank: player.rank,
          name: player.name,
          team: "Football Club",
          goals: player.goals,
          assists: player.assists,
          initials: player.abbreviation
        }))
        
        setPlayers(transformedPlayers)
      } else {
        console.error('Failed to fetch leaderboard:', data.error)
        // Keep default data on error
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      // Keep default data on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const type = activeTab === 0 ? 'goals' : 'assists'
    fetchLeaderboard(type)
  }, [activeTab, selectedYear])

  // Handle player navigation
  const handlePlayerClick = (playerId: string) => {
    router.push(`/player/${playerId}`)
  }

  // Sort all players based on active tab (data comes pre-sorted from API)
  const getSortedPlayers = () => {
    return players.map((player, index) => ({
      ...player,
      position: player.rank || (index + 1)
    }))
  }

  const sortedPlayers = getSortedPlayers()
  const podiumPlayers = sortedPlayers.slice(0, 3).map((player, index) => ({
    ...player,
    medal: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'
  }))
  const listPlayers = sortedPlayers.slice(3)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      // Swipe left - next tab
      setActiveTab(prev => prev === 0 ? 1 : 0)
    } else if (touchEndX.current - touchStartX.current > 50) {
      // Swipe right - previous tab
      setActiveTab(prev => prev === 1 ? 0 : 1)
    }
  }

  const currentStat = activeTab === 0 ? 'goals' : 'assists'

  return (
      <div className={`${styles.container} ${mulish.className}`}>
        
        <div className={styles.mobileView}>
          <header className={styles.pageHeader}>
            <div className={styles.backButton}>
              <Link href="/">
                <Image src="/back.svg" alt="返回" className={styles.backIcon} width={16} height={16} />
                返回
              </Link>
            </div>
            {/* Year Selector */}
            <div className={styles.yearSelector}>
              <YearSelector
                value={selectedYear}
                onChange={setSelectedYear}
                minYear={currentYear - 2}  // Allow 2 years back
                maxYear={currentYear}      // Up to current year
              />
            </div>
            {/* Tabbed Navigation and Year Selector */}
            <div className={styles.tabContainer}>
              <div 
                className={styles.tabWrapper}
                ref={tabsRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {tabs.map((tab, index) => (
                  <button
                    key={index}
                    className={`${styles.tab} ${activeTab === index ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab(index)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              
            </div>
          </header>

          <main>
            {loading ? (
              <div className={styles.loading}>加载中...</div>
            ) : (
              <div className={styles.contentContainer}>
              <section className={styles.podium}>
                {podiumPlayers.map((player) => (
                  <div 
                    key={player.id} 
                    className={`${styles.podiumItem} ${styles[player.medal]} ${styles.clickable}`}
                    onClick={() => handlePlayerClick(player.id.toString())}
                  >
                    <div className={styles.podiumPlayerContainer}>
                      <div className={styles.rank}>{player.position}</div>
                      <div className={styles.playerImg}>{player.initials}</div>
                    </div>
                    <div className={styles.name}>{player.name}</div>
                    {/* <div className={styles.team}>{player.team}</div> */}
                    <div className={styles.goals}>{player[currentStat] as number}</div>
                  </div>
                ))}
              </section>

              <section className={styles.scorersList}>
                {listPlayers.map((player) => (
                  <div 
                    key={player.id} 
                    className={`${styles.listItem} ${styles.clickable}`}
                    onClick={() => handlePlayerClick(player.id.toString())}
                  >
                    <div className={styles.rank}>{player.position}</div>
                    <div className={styles.playerInfo}>
                      <div className={styles.playerImg}>{player.initials}</div>
                      <div className={styles.details}>
                        <div className={styles.name}>{player.name}</div>
                        {/* <div className={styles.team}>{player.team}</div> */}
                      </div>
                    </div>
                    <div className={styles.goals}>{player[currentStat] as number}</div>
                  </div>
                ))}
              </section>
              </div>
            )}
          </main>
        </div>
      </div>
  )
}

