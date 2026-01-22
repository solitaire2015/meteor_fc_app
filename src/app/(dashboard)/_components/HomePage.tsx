'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import GuestSignupBanner from '@/components/custom/GuestSignupBanner'

// Type definitions
interface Game {
  id: string;
  date: string;
  opponent: string;
  result: string;
  status: "已结束" | "即将开始";
  ourScore?: number | null;
  opponentScore?: number | null;
  matchDate?: string;
}

interface MatchData {
  id: string;
  matchDate: string;
  matchTime: string | null;
  opponentTeam: string;
  ourScore: number | null;
  opponentScore: number | null;
  matchResult: string | null;
  fieldFeeTotal: number;
  waterFeeTotal: number;
  feeCoefficient: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  totalParticipants: number;
  totalGoals: number;
  totalAssists: number;
  totalCalculatedFees: number;
  participationsCount: number;
  eventsCount: number;
  videosCount: number;
  commentsCount: number;
  date: string;
  opponent: string;
  result: string;
  status: "已结束" | "即将开始";
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

export default function Home({
  title = "流星足球俱乐部",
  subtitle = "METEOR FC",
  games: initialGames = [],
  monthlyStatsList: initialMonthlyStatsList = []
}: HomeProps) {
  const [games, setGames] = useState<Game[]>(initialGames)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [statsType, setStatsType] = useState<'monthly' | 'yearly'>('monthly')
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [showAllGames, setShowAllGames] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const GAMES_PER_PAGE = 5
  const initialDisplayCount = 3

  // Generate year options (current year and previous years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - i,
    label: `${currentYear - i}年`
  }))

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}月`
  }))

  useEffect(() => {
    fetchGames()
  }, [])

  useEffect(() => {
    fetchTeamStats()
  }, [selectedYear, selectedMonth, statsType])

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      const data: APIResponse<MatchData[]> = await response.json()

      if (data.success) {
        const transformedGames = data.data.map(match => ({
          id: match.id,
          date: match.matchDate,
          opponent: match.opponentTeam,
          result: match.matchResult || '',
          status: (match.ourScore !== null && match.opponentScore !== null) ? "已结束" as const : "即将开始" as const,
          ourScore: match.ourScore,
          opponentScore: match.opponentScore,
          matchDate: match.matchDate
        }))
        setGames(transformedGames)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamStats = async () => {
    try {
      let url = `/api/stats?type=team&year=${selectedYear}`
      if (statsType === 'monthly') {
        url += `&month=${selectedMonth}`
      }

      const response = await fetch(url)
      const data: APIResponse<TeamStats> = await response.json()

      if (data.success) {
        setTeamStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching team stats:', error)
    }
  }

  const handleShowMoreGames = () => {
    setShowAllGames(true)
    setCurrentPage(1)
  }

  const handleShowLessGames = () => {
    setShowAllGames(false)
    setCurrentPage(1)
  }

  const getDisplayedGames = () => {
    if (!showAllGames) {
      return games.slice(0, initialDisplayCount)
    }

    const startIndex = (currentPage - 1) * GAMES_PER_PAGE
    const endIndex = startIndex + GAMES_PER_PAGE
    return games.slice(startIndex, endIndex)
  }

  const getTotalPages = () => {
    return Math.ceil(games.length / GAMES_PER_PAGE)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#7B8EE3] to-[#B8AFFF] flex items-center justify-center relative">
        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/10 text-[80px] font-black select-none">METEOR CLUB</span>
        </div>
        <div className="bg-white/25 backdrop-blur-[10px] border border-white/20 rounded-[15px] p-6 text-center z-10">
          <div className="text-lg font-medium text-white">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7B8EE3] to-[#B8AFFF] relative font-mulish">
      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white/10 text-[80px] font-black select-none">METEOR CLUB</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <img
            src="/meteor_fc.png"
            alt="METEOR CLUB Logo"
            className="h-20 mx-auto mb-4 rounded-[15px] object-contain border-2 border-white/30 shadow-lg bg-white/10 p-1"
          />
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-white/75 font-medium">{subtitle}</p>
        </header>

        <GuestSignupBanner
          className="border-white/30 bg-white/20 text-white"
          buttonVariant="secondary"
          buttonClassName="text-slate-900"
        />

        {/* Navigation Card */}
        <section className="mb-6">
          <Link href="/leaderboard" className="block">
            <div className="bg-white/25 backdrop-blur-[10px] border border-white/20 rounded-[20px] p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white/35 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]">
              <div className="text-5xl mb-2">🏆</div>
              <div className="text-xl font-bold text-white mb-1">荣誉殿堂</div>
              <div className="text-sm text-white/75 font-medium">查看球员排行榜</div>
            </div>
          </Link>
        </section>

        {/* Games Section */}
        <section className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">比赛记录</h2>
          {games.length === 0 ? (
            <div className="text-center text-white/75 py-8">
              暂无比赛记录
            </div>
          ) : (
            <div className="space-y-3">
              {getDisplayedGames().map((game) => (
                <Link key={game.id} href={`/games/${game.id}`} className="block">
                  <div className="bg-white/25 backdrop-blur-[10px] border border-white/20 rounded-[15px] p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/35 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-white/75 font-medium">
                            {new Date(game.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-2 text-white font-semibold">
                            <span>流星FC</span>
                            <span className="text-white/75">VS</span>
                            <span>{game.opponent}</span>
                          </div>
                        </div>
                        {game.status === "已结束" && game.ourScore !== null && game.opponentScore !== null && (
                          <div className="mt-2 text-lg font-bold text-white">
                            {game.ourScore} - {game.opponentScore}
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${game.status === "已结束"
                        ? "bg-green-500/20 text-green-100 border border-green-400/30"
                        : "bg-orange-500/20 text-orange-100 border border-orange-400/30"
                        }`}>
                        {game.status}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Show more/less controls */}
              {!showAllGames && games.length > initialDisplayCount && (
                <div className="text-center pt-2">
                  <button
                    onClick={handleShowMoreGames}
                    className="text-white/75 hover:text-white text-sm font-medium transition-colors"
                  >
                    查看更多比赛 ({games.length - initialDisplayCount}场)
                  </button>
                </div>
              )}

              {showAllGames && (
                <div className="space-y-3">
                  {/* Pagination controls */}
                  {getTotalPages() > 1 && (
                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${currentPage === 1
                          ? 'text-white/50 cursor-not-allowed'
                          : 'text-white/75 hover:text-white hover:bg-white/10'
                          }`}
                      >
                        上一页
                      </button>

                      <span className="text-white/75">
                        第 {currentPage} 页，共 {getTotalPages()} 页
                      </span>

                      <button
                        onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                        disabled={currentPage === getTotalPages()}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${currentPage === getTotalPages()
                          ? 'text-white/50 cursor-not-allowed'
                          : 'text-white/75 hover:text-white hover:bg-white/10'
                          }`}
                      >
                        下一页
                      </button>
                    </div>
                  )}

                  {/* Show less button */}
                  <div className="text-center pt-2">
                    <button
                      onClick={handleShowLessGames}
                      className="text-white/75 hover:text-white text-sm font-medium transition-colors"
                    >
                      收起比赛列表
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Statistics Section */}
        <section>
          <div className="bg-white/25 backdrop-blur-[10px] border border-white/20 rounded-[15px] p-6 space-y-6">
            {/* Stats Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">统计数据</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatsType('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statsType === 'monthly'
                    ? 'bg-white/20 text-white'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                >
                  月度
                </button>
                <button
                  onClick={() => setStatsType('yearly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statsType === 'yearly'
                    ? 'bg-white/20 text-white'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                >
                  年度
                </button>
              </div>
            </div>

            {/* Time Selectors */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {statsType === 'monthly' && (
                <div className="flex-1">
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-white">{teamStats?.totalMatches || 0}</div>
                <div className="text-sm text-white/75 font-semibold">已踢场次</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">{teamStats?.wins || 0}</div>
                <div className="text-sm text-white/75 font-semibold">胜利</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">{teamStats?.draws || 0}</div>
                <div className="text-sm text-white/75 font-semibold">平局</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">{teamStats?.losses || 0}</div>
                <div className="text-sm text-white/75 font-semibold">失利</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">{teamStats?.goalsFor || 0}</div>
                <div className="text-sm text-white/75 font-semibold">进球</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-white">{teamStats?.goalsAgainst || 0}</div>
                <div className="text-sm text-white/75 font-semibold">失球</div>
              </div>
            </div>

            {/* Additional Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-black text-white">{teamStats?.winRate ? `${teamStats.winRate}%` : '0%'}</div>
                <div className="text-sm text-white/75 font-semibold">胜率</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-white">{teamStats?.averageGoalsPerMatch || 0}</div>
                <div className="text-sm text-white/75 font-semibold">场均进球</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-white">{teamStats?.goalDifference || 0}</div>
                <div className="text-sm text-white/75 font-semibold">净胜球</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-white">{teamStats?.averageGoalsAgainstPerMatch || 0}</div>
                <div className="text-sm text-white/75 font-semibold">场均被进球</div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
