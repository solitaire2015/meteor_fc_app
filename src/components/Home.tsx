'use client'

import Head from 'next/head'
import { Mulish } from 'next/font/google'
import { useState } from 'react'
import Link from 'next/link'
import Select from 'react-select'
import styles from '../styles/Home.module.css'

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

export default function Home({ 
  title = "流星足球俱乐部",
  subtitle = "METEOR FC",
  games = defaultGames,
  monthlyStatsList = defaultMonthlyStatsList
}: HomeProps) {
  const [isYearlyView, setIsYearlyView] = useState(false)
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState(8)

  // Get available years and months
  const availableYears = [...new Set(monthlyStatsList.map(stat => stat.year))].sort((a, b) => b - a)
  const availableMonths = monthlyStatsList
    .filter(stat => stat.year === selectedYear)
    .map(stat => stat.month)
    .sort((a, b) => b - a)

  // Calculate yearly stats from monthly data
  const getYearlyStats = (year: number) => {
    const yearData = monthlyStatsList.filter(stat => stat.year === year)
    return yearData.reduce((acc, curr) => ({
      gamesPlayed: acc.gamesPlayed + curr.gamesPlayed,
      wins: acc.wins + curr.wins,
      draws: acc.draws + curr.draws,
      losses: acc.losses + curr.losses,
      goalsFor: acc.goalsFor + curr.goalsFor,
      goalsAgainst: acc.goalsAgainst + curr.goalsAgainst
    }), {
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    })
  }

  // Get current stats to display
  const getCurrentStats = () => {
    if (isYearlyView) {
      return getYearlyStats(selectedYear)
    } else {
      return monthlyStatsList.find(stat => 
        stat.year === selectedYear && stat.month === selectedMonth
      ) || {
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
      }
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
                      <Link href="/game-details" className={styles.gameLink}>
                        <div className={styles.gameInfo}>
                          <span className={styles.gameDate}>{game.date}</span>
                          <div className={styles.gameMatch}>
                            <span>METEOR</span>
                            <span>{game.result}</span>
                            <span>{game.opponent.toUpperCase()}</span>
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
                            <span>{game.opponent.toUpperCase()}</span>
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
                  <Select
                    instanceId="year-select"
                    value={yearOptions.find(option => option.value === selectedYear)}
                    onChange={(option) => option && setSelectedYear(option.value)}
                    options={yearOptions}
                    styles={selectStyles}
                    isSearchable={false}
                    placeholder="选择年份"
                  />
                </div>
                
                {!isYearlyView && (
                  <div className={styles.selectWrapper}>
                    <Select
                      instanceId="month-select"
                      value={monthOptions.find(option => option.value === selectedMonth)}
                      onChange={(option) => option && setSelectedMonth(option.value)}
                      options={monthOptions}
                      styles={selectStyles}
                      isSearchable={false}
                      placeholder="选择月份"
                    />
                  </div>
                )}
              </div>

              {/* Stats Grid */}
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
            </section>
          </main>
        </div>
      </div>
    </>
  )
}