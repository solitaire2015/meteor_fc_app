'use client'

import Head from 'next/head'
import { Mulish } from 'next/font/google'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './HomePage.module.css'

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

// Type definitions
interface Game {
  id: number;
  date: string;
  opponent: string;
  result: string;
  status: "已结束" | "即将开始";
  ourScore?: number | null;
  opponentScore?: number | null;
  matchDate?: string;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code?: string;
  };
}

interface TeamStats {
  period: string;
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  averageGoalsPerMatch: string;
  averageGoalsAgainstPerMatch: string;
}

interface MonthlyStats {
  year: number;
  month: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface HomeProps {
  title?: string;
  subtitle?: string;
  games?: Game[];
  monthlyStatsList?: MonthlyStats[];
}

// Default data
const defaultGames: Game[] = [
  {
    id: 1,
    date: "8月23日",
    opponent: "十七苝",
    result: "3:5",
    status: "已结束"
  },
  {
    id: 2,
    date: "8月16日",
    opponent: "FYL",
    result: "2:1",
    status: "已结束"
  },
  {
    id: 3,
    date: "8月9日",
    opponent: "雷霆",
    result: "4:2",
    status: "已结束"
  },
  {
    id: 4,
    date: "8月2日",
    opponent: "星辰",
    result: "1:3",
    status: "已结束"
  },
  {
    id: 5,
    date: "8月30日",
    opponent: "飞鹰",
    result: "--",
    status: "即将开始"
  }
];

const defaultMonthlyStatsList: MonthlyStats[] = [
  {
    year: 2025,
    month: 8,
    gamesPlayed: 4,
    wins: 2,
    draws: 0,
    losses: 2,
    goalsFor: 10,
    goalsAgainst: 11
  },
  {
    year: 2025,
    month: 7,
    gamesPlayed: 3,
    wins: 1,
    draws: 1,
    losses: 1,
    goalsFor: 6,
    goalsAgainst: 5
  },
  {
    year: 2025,
    month: 6,
    gamesPlayed: 2,
    wins: 2,
    draws: 0,
    losses: 0,
    goalsFor: 8,
    goalsAgainst: 2
  },
  {
    year: 2024,
    month: 12,
    gamesPlayed: 5,
    wins: 3,
    draws: 1,
    losses: 1,
    goalsFor: 15,
    goalsAgainst: 8
  }
];

// Custom Select Component
interface SelectOption {
  value: number;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
}

function CustomSelect({ options, value, onChange, placeholder }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={styles.customSelect}>
      <div 
        className={styles.selectTrigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span className={`${styles.selectArrow} ${isOpen ? styles.selectArrowUp : ''}`}>▼</span>
      </div>
      
      {isOpen && (
        <div className={styles.selectDropdown}>
          {options.map(option => (
            <div
              key={option.value}
              className={`${styles.selectOption} ${option.value === value ? styles.selectOptionSelected : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home({ 
  title = "流星足球俱乐部",
  subtitle = "METEOR FC"
}: HomeProps) {
  const [games, setGames] = useState<Game[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isYearlyView, setIsYearlyView] = useState(false)
  
  // Get current date and set defaults
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11, we need 1-12
  
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear])
  const [availableMonths, setAvailableMonths] = useState<number[]>([currentMonth])

  // Fetch games data
  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      const data: APIResponse<any[]> = await response.json()
      
      if (data.success) {
        const formattedGames: Game[] = data.data.map(match => ({
          id: match.id,
          date: formatMatchDate(match.matchDate),
          opponent: match.opponentTeam,
          result: formatMatchResult(match.ourScore, match.opponentScore),
          status: match.status as "已结束" | "即将开始",
          ourScore: match.ourScore,
          opponentScore: match.opponentScore,
          matchDate: match.matchDate
        }))
        setGames(formattedGames)
        
        // Extract available years and months from game dates
        const dates = data.data.map(match => new Date(match.matchDate))
        const years = [...new Set(dates.map(date => date.getFullYear()))].sort((a, b) => b - a)
        
        // If no games, keep current year as default
        if (years.length > 0) {
          setAvailableYears(years)
          
          // Get months for currently selected year
          const currentYearDates = dates.filter(date => date.getFullYear() === selectedYear)
          const months = [...new Set(currentYearDates.map(date => date.getMonth() + 1))].sort((a, b) => b - a)
          
          // If selected year has games, use those months, otherwise keep current month
          if (months.length > 0) {
            setAvailableMonths(months)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }
  
  // Fetch team statistics
  const fetchTeamStats = async () => {
    try {
      const statsType = isYearlyView ? 'year' : 'month'
      const response = await fetch(`/api/stats?type=team&year=${selectedYear}${!isYearlyView ? `&month=${selectedMonth}` : ''}`)
      const data: APIResponse<TeamStats> = await response.json()
      
      if (data.success) {
        setTeamStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching team stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Format match date for display
  const formatMatchDate = (dateString: string): string => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  }
  
  // Format match result for display
  const formatMatchResult = (ourScore: number | null, opponentScore: number | null): string => {
    if (ourScore === null || opponentScore === null) {
      return '--'
    }
    return `${ourScore}:${opponentScore}`
  }
  
  // Load data on component mount and when filters change
  useEffect(() => {
    fetchGames()
    fetchTeamStats() // Load stats immediately, independent of games
  }, [])
  
  useEffect(() => {
    fetchTeamStats()
  }, [isYearlyView, selectedYear, selectedMonth])

  // Enhanced statistics calculations
  const getCurrentStats = () => {
    if (!teamStats) {
      return {
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        winRate: 0,
        goalDifference: 0,
        avgGoalsFor: 0,
        avgGoalsAgainst: 0,
        formGuide: [],
        points: 0
      }
    }
    
    const gamesPlayed = teamStats.totalMatches
    const winRate = gamesPlayed > 0 ? Math.round((teamStats.wins / gamesPlayed) * 100) : 0
    const goalDifference = teamStats.goalsFor - teamStats.goalsAgainst
    const avgGoalsFor = gamesPlayed > 0 ? (teamStats.goalsFor / gamesPlayed).toFixed(1) : '0.0'
    const avgGoalsAgainst = gamesPlayed > 0 ? (teamStats.goalsAgainst / gamesPlayed).toFixed(1) : '0.0'
    const points = (teamStats.wins * 3) + teamStats.draws
    
    // Form guide from recent games (last 5)
    const recentGames = games.slice(0, 5)
    const formGuide = recentGames.map(game => {
      if (game.ourScore === null || game.opponentScore === null) return 'U' // Upcoming
      if (game.ourScore > game.opponentScore) return 'W' // Win
      if (game.ourScore < game.opponentScore) return 'L' // Loss
      return 'D' // Draw
    })
    
    return {
      gamesPlayed,
      wins: teamStats.wins,
      draws: teamStats.draws,
      losses: teamStats.losses,
      goalsFor: teamStats.goalsFor,
      goalsAgainst: teamStats.goalsAgainst,
      winRate,
      goalDifference,
      avgGoalsFor: parseFloat(avgGoalsFor),
      avgGoalsAgainst: parseFloat(avgGoalsAgainst),
      formGuide,
      points
    }
  }

  const currentStats = getCurrentStats()

  // Month name helper
  const getMonthName = (month: number) => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    return months[month - 1]
  }

  // React-select options
  const yearOptions = availableYears.map(year => ({
    value: year,
    label: `${year}年`
  }))

  const monthOptions = availableMonths.map(month => ({
    value: month,
    label: getMonthName(month)
  }))

  // Custom styles for react-select
  const selectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      background: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '10px',
      padding: '2px 4px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#FFFFFF',
      cursor: 'pointer',
      minHeight: '36px',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(255, 255, 255, 0.3)' : 'none',
      '&:hover': {
        borderColor: 'rgba(255, 255, 255, 0.4)'
      }
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '600'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '14px'
    }),
    menu: (provided: any) => ({
      ...provided,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '10px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'rgba(123, 142, 227, 0.8)' 
        : state.isFocused 
        ? 'rgba(123, 142, 227, 0.2)' 
        : 'transparent',
      color: state.isSelected ? '#FFFFFF' : '#2C2C3E',
      fontSize: '14px',
      fontWeight: '600',
      padding: '8px 12px',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'rgba(123, 142, 227, 0.3)'
      }
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: 'rgba(255, 255, 255, 0.7)',
      '&:hover': {
        color: '#FFFFFF'
      }
    })
  }
  
  if (loading) {
    return (
      <div className={`${styles.container} ${mulish.className}`}>
        <div className={styles.mobileView}>
          <div className={styles.loading}>加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{`${title} - Team Colors`}</title>
        <meta name="description" content="Football club home page" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={`${styles.container} ${mulish.className}`}>
        <div className={styles.mobileView}>
          <header className={styles.pageHeader}>
            <div className={styles.logoContainer}>
              <img src="/meteor_fc.png" alt="METEOR CLUB Logo" className={styles.teamLogo} />
            </div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>

          <main>
            {/* Navigation Section */}
            <section className={styles.navigationSection}>
              <Link href="/leaderboard" className={styles.navCard}>
                <div className={styles.navIcon}>🏆</div>
                <div className={styles.navTitle}>荣誉殿堂</div>
                <div className={styles.navSubtitle}>查看球员排行榜</div>
              </Link>
            </section>

            {/* Games List Section */}
            <section className={styles.gamesSection}>
              <h2 className={styles.sectionTitle}>比赛记录</h2>
              <div className={styles.gamesList}>
                {games.map((game) => (
                  <div key={game.id} className={styles.gameCard}>
                    {game.status === "已结束" ? (
                      <Link href={`/game-details/${game.id}`} className={styles.gameLink}>
                        <div className={styles.gameInfo}>
                          <span className={styles.gameDate}>{game.date}</span>
                          <div className={styles.gameMatch}>
                            <span>METEOR</span>
                            <span>{game.result}</span>
                            <span>{game.opponent}</span>
                          </div>
                          <span className={`${styles.status} ${styles.finished}`}>
                            {game.status}
                          </span>
                        </div>
                        <div className={styles.viewDetails}>查看详情 →</div>
                      </Link>
                    ) : (
                      <div className={styles.gameContent}>
                        <div className={styles.gameInfo}>
                          <span className={styles.gameDate}>{game.date}</span>
                          <div className={styles.gameMatch}>
                            <span>METEOR</span>
                            <span>{game.result}</span>
                            <span>{game.opponent}</span>
                          </div>
                          <span className={`${styles.status} ${styles.upcoming}`}>
                            {game.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Enhanced Stats Section */}
            <section className={styles.quickStats}>
              <div className={styles.statsHeader}>
                <h2 className={styles.sectionTitle}>统计数据</h2>
                
                {/* View Toggle */}
                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.toggleBtn} ${!isYearlyView ? styles.active : ''}`}
                    onClick={() => setIsYearlyView(false)}
                  >
                    月度
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${isYearlyView ? styles.active : ''}`}
                    onClick={() => setIsYearlyView(true)}
                  >
                    年度
                  </button>
                </div>
              </div>

              {/* Date Selector */}
              <div className={styles.dateSelector}>
                <div className={styles.selectWrapper}>
                  <CustomSelect
                    options={yearOptions}
                    value={selectedYear}
                    onChange={setSelectedYear}
                    placeholder="选择年份"
                  />
                </div>
                
                {!isYearlyView && (
                  <div className={styles.selectWrapper}>
                    <CustomSelect
                      options={monthOptions}
                      value={selectedMonth}
                      onChange={setSelectedMonth}
                      placeholder="选择月份"
                    />
                  </div>
                )}
              </div>

              {/* Enhanced Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.gamesPlayed}</div>
                  <div className={styles.statLabel}>已踢场次</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.wins}</div>
                  <div className={styles.statLabel}>胜利</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.draws}</div>
                  <div className={styles.statLabel}>平局</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.losses}</div>
                  <div className={styles.statLabel}>失利</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.goalsFor}</div>
                  <div className={styles.statLabel}>进球</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.goalsAgainst}</div>
                  <div className={styles.statLabel}>失球</div>
                </div>
              </div>
              
              {/* Advanced Statistics */}
              <div className={styles.advancedStats}>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.winRate}%</div>
                  <div className={styles.statLabel}>胜率</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.points}</div>
                  <div className={styles.statLabel}>积分</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.goalDifference > 0 ? '+' : ''}{currentStats.goalDifference}</div>
                  <div className={styles.statLabel}>净胜球</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{currentStats.avgGoalsFor}</div>
                  <div className={styles.statLabel}>场均进球</div>
                </div>
              </div>
              
              {/* Form Guide */}
              {currentStats.formGuide.length > 0 && (
                <div className={styles.formSection}>
                  <h3 className={styles.formTitle}>近期战绩</h3>
                  <div className={styles.formGuide}>
                    {currentStats.formGuide.map((result, index) => (
                      <div 
                        key={index} 
                        className={`${styles.formResult} ${styles[`form${result}`]}`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </>
  )
}