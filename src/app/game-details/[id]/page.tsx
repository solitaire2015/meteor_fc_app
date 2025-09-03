'use client'

import Head from 'next/head'
import { Mulish } from 'next/font/google'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import styles from './GameDetails.module.css'

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

// API Types
interface MatchData {
  id: string;
  matchDate: string;
  opponentTeam: string;
  ourScore?: number | null;
  opponentScore?: number | null;
  fieldFeeTotal: number;
  waterFeeTotal: number;
  feeCoefficient: number;
  notes?: string;
  participations: MatchParticipation[];
  events: MatchEvent[];
}

interface MatchParticipation {
  id: string;
  userId: string;
  attendanceData: any;
  isLateArrival: boolean;
  totalTime: number;
  fieldFeeCalculated: number;
  lateFee: number;
  videoFee: number;
  totalFeeCalculated: number;
  user: {
    id: string;
    name: string;
    jerseyNumber?: number;
    position?: string;
  };
}

interface MatchEvent {
  id: string;
  eventType: string;
  minute?: number;
  description?: string;
  player: {
    id: string;
    name: string;
    jerseyNumber?: number;
  };
}

// Component Types
interface Player {
  id: string;
  name: string;
  section1: (number | string)[];
  section2: (number | string)[];
  section3: (number | string)[];
  total: number;
  fieldFee: number;
  onTime: boolean;
  videoCost: number;
  totalCost: number;
  notes: string;
}

interface GameStat {
  name: string;
  goals: number;
  assists: number;
}

interface VideoRecord {
  fileName: string;
  description: string;
  url: string;
  extractCode: string;
}

interface GameSummary {
  totalFieldCost: number;
  totalActualCost: number;
  fieldCostNote: string;
}

// Helper functions to calculate derived values
const calculateLateFee = (onTime: boolean, total: number): number => {
  return (total > 0 && !onTime) ? 10 : 0;
};

const getLateStatus = (onTime: boolean, total: number): string => {
  if (total === 0) return '未参加';
  return onTime ? '准时到场' : '迟到';
};

// Default data for demo (temporarily until real attendance API is ready)
const defaultGameData: Player[] = [
  { id: "1", name: "东辉", section1: [1, 1, 1], section2: [0, 0, 1], section3: [0, 0, 0], total: 4, fieldFee: 51, onTime: true, videoCost: 54, totalCost: 105, notes: "" },
  { id: "2", name: "超", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, fieldFee: 0, onTime: false, videoCost: 0, totalCost: 0, notes: "观战" },
  { id: "3", name: "卜", section1: [1, 1, 1], section2: [0, 0, 0], section3: [1, 1, 1], total: 6, fieldFee: 77, onTime: true, videoCost: 81, totalCost: 158, notes: "" },
];

const defaultGameStats: GameStat[] = [
  { name: "马", goals: 1, assists: 0 },
  { name: "得瑞克", goals: 1, assists: 1 },
];

// Helper function to parse video data from match notes
const parseVideoData = (notes: string | null): VideoRecord | null => {
  if (!notes) return null
  
  try {
    const parsedNotes = JSON.parse(notes)
    const videoInfo = parsedNotes.video
    
    if (videoInfo && (videoInfo.url || videoInfo.description)) {
      return {
        fileName: "比赛录像",
        description: videoInfo.description || "通过网盘分享的文件",
        url: videoInfo.url || "",
        extractCode: videoInfo.extractCode || ""
      }
    }
  } catch (error) {
    console.log('Failed to parse video data from notes:', error)
  }
  
  return null
}

export default function GameDetailsPage() {
  const params = useParams()
  const matchId = params.id as string
  const [match, setMatch] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [gameData, setGameData] = useState<Player[]>(defaultGameData)
  const [gameStats, setGameStats] = useState<GameStat[]>(defaultGameStats)
  const [videoRecord, setVideoRecord] = useState<VideoRecord | null>(null)

  // Helper function to parse attendance data
  const parseAttendanceData = (attendanceData: any) => {
    const attendance = attendanceData?.attendance || {}
    const goalkeeper = attendanceData?.goalkeeper || {}
    
    const section1 = []
    const section2 = []
    const section3 = []
    
    // Parse sections 1-3, parts 1-3
    for (let part = 1; part <= 3; part++) {
      // Section 1
      if (goalkeeper['1']?.[part.toString()]) {
        section1.push('守门')
      } else {
        section1.push(attendance['1']?.[part.toString()] || 0)
      }
      
      // Section 2
      if (goalkeeper['2']?.[part.toString()]) {
        section2.push('守门')
      } else {
        section2.push(attendance['2']?.[part.toString()] || 0)
      }
      
      // Section 3
      if (goalkeeper['3']?.[part.toString()]) {
        section3.push('守门')
      } else {
        section3.push(attendance['3']?.[part.toString()] || 0)
      }
    }
    
    return { section1, section2, section3 }
  }

  useEffect(() => {
    const fetchMatchAndDetails = async () => {
      try {
        // Fetch match data with participations and events
        const matchResponse = await fetch(`/api/games/${matchId}`)
        const matchData = await matchResponse.json()
        
        if (matchData.success) {
          const matchInfo = matchData.data
          setMatch(matchInfo)
          
          console.log('Match data:', matchInfo)
          
          // Transform participation data to Player format
          if (matchInfo.participations && matchInfo.participations.length > 0) {
            const players: Player[] = matchInfo.participations.map((participation: MatchParticipation) => {
              const { section1, section2, section3 } = parseAttendanceData(participation.attendanceData)
              
              return {
                id: participation.userId,
                name: participation.user.name,
                section1,
                section2,
                section3,
                total: Number(participation.totalTime),
                fieldFee: Number(participation.fieldFeeCalculated),
                onTime: !participation.isLateArrival,
                videoCost: Number(participation.videoFee),
                totalCost: Number(participation.totalFeeCalculated),
                notes: participation.notes || ''
              }
            })
            
            console.log('Transformed players:', players)
            setGameData(players)
          }
          
          // Transform events to game stats format
          if (matchInfo.events && matchInfo.events.length > 0) {
            // Group events by player
            const playerStats: { [playerId: string]: { name: string; goals: number; assists: number } } = {}
            
            matchInfo.events.forEach((event: MatchEvent) => {
              const playerId = event.player.id
              if (!playerStats[playerId]) {
                playerStats[playerId] = {
                  name: event.player.name,
                  goals: 0,
                  assists: 0
                }
              }
              
              if (event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL') {
                playerStats[playerId].goals++
              } else if (event.eventType === 'ASSIST') {
                playerStats[playerId].assists++
              }
            })
            
            // Convert to array and filter players with stats
            const stats: GameStat[] = Object.values(playerStats)
              .filter(stat => stat.goals > 0 || stat.assists > 0)
            
            console.log('Transformed stats:', stats)
            setGameStats(stats)
          }
          
          // Parse and set video data from match notes
          const videoData = parseVideoData(matchInfo.notes)
          setVideoRecord(videoData)
          console.log('Parsed video data:', videoData)
        }
      } catch (error) {
        console.error('Error fetching match:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (matchId) {
      fetchMatchAndDetails()
    }
  }, [matchId])

  const toggleRow = (playerId: string) => {
    setExpandedRows(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const renderSection = (sectionData: any) => {
    return (
      <div className={styles.sectionGroup}>
        {sectionData.map((value: any, partIndex: number) => (
          <div 
            key={partIndex}
            className={`${styles.sectionPart} ${
              value === 1 ? styles.full : 
              value === 0.5 ? styles.half : 
              value === "守门" ? styles.goalkeeper :
              styles.empty
            }`}
          >
            {value === "守门" ? "门" : value || ""}
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  const getResult = () => {
    if (match?.ourScore !== null && match?.opponentScore !== null) {
      return `${match.ourScore}:${match.opponentScore}`
    }
    return '即将开始'
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

  if (!match) {
    return (
      <div className={`${styles.container} ${mulish.className}`}>
        <div className={styles.mobileView}>
          <div className={styles.loading}>比赛信息不存在</div>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="/" style={{ color: 'white', textDecoration: 'none' }}>返回首页</a>
          </div>
        </div>
      </div>
    )
  }

  const title = `${formatDate(match.matchDate)}VS${match.opponentTeam}`
  const subtitle = `进球助攻 ${getResult()}`
  
  // Calculate summary from real match data
  const gameSummary: GameSummary = {
    totalFieldCost: Number(match.fieldFeeTotal) + Number(match.waterFeeTotal),
    totalActualCost: gameData.reduce((sum, player) => sum + player.totalCost, 0),
    fieldCostNote: `场地${Number(match.fieldFeeTotal)}+水费${Number(match.waterFeeTotal)}`
  };

  return (
    <>
      <Head>
        <title>{`${title} - Team Colors`}</title>
        <meta name="description" content="Football game details" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={`${styles.container} ${mulish.className}`}>
        <div className={styles.mobileView}>
          <header className={styles.pageHeader}>
            <div className={styles.backButton}>
              <a href="/">
                <img src="/back.svg" alt="返回" className={styles.backIcon} />
                返回
              </a>
            </div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>

          <main>
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <div className={styles.headerRow}>
                  <div className={styles.playerCol}>姓名</div>
                  <div className={styles.sectionCol}>第一节</div>
                  <div className={styles.sectionCol}>第二节</div>
                  <div className={styles.sectionCol}>第三节</div>
                  <div className={styles.actualCol}>实收费用</div>
                </div>
              </div>

              <div className={styles.tableBody}>
                {gameData.map((player, index) => (
                  <div key={player.id}>
                    <div 
                      className={`${styles.playerRow} ${expandedRows.includes(player.id) ? styles.expanded : ''}`}
                      onClick={() => toggleRow(player.id)}
                    >
                      <div className={styles.playerCol}>
                        <span className={styles.playerNumber}>{index + 1}</span>
                        <span className={styles.playerName}>{player.name}</span>
                        <span className={styles.expandIcon}>
                          {expandedRows.includes(player.id) ? '−' : '+'}
                        </span>
                      </div>
                      <div className={styles.sectionCol}>
                        {renderSection(player.section1)}
                      </div>
                      <div className={styles.sectionCol}>
                        {renderSection(player.section2)}
                      </div>
                      <div className={styles.sectionCol}>
                        {renderSection(player.section3)}
                      </div>
                      <div className={styles.actualCol}>{player.totalCost}</div>
                    </div>
                    
                    {expandedRows.includes(player.id) && (
                      <div className={styles.expandedRow}>
                        <div className={styles.expandedContent}>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>出勤情况:</span>
                            <span className={styles.detailValue}>{getLateStatus(player.onTime, player.total)}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>迟到罚款:</span>
                            <span className={styles.detailValue}>{calculateLateFee(player.onTime, player.total)}元</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>录像费用:</span>
                            <span className={styles.detailValue}>{player.videoCost}元</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>场地费用:</span>
                            <span className={styles.detailValue}>{player.fieldFee}元</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>总费用:</span>
                            <span className={styles.detailValue}>{player.totalCost}元</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>备注:</span>
                            <span className={styles.detailValue}>{player.notes || '无'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.summary}>
                <p>场地费用合计: {gameSummary.totalFieldCost}元 ({gameSummary.fieldCostNote})</p>
                <p>实收费用合计: {gameSummary.totalActualCost}元</p>
              </div>
            </div>

            <div className={styles.statsSection}>
              <h2 className={styles.statsTitle}>比赛数据统计</h2>
              <div className={styles.statsGrid}>
                {gameStats.map((stat, index) => (
                  <div key={index} className={styles.statCard}>
                    <div className={styles.statPlayer}>{stat.name}</div>
                    <div className={styles.statDetails}>
                      <span className={styles.statGoals}>
                        <img src="/ios-football.svg" alt="进球" className={styles.statIcon} />
                        {stat.goals}
                      </span>
                      <span className={styles.statAssists}>
                        <img src="/assist.svg" alt="助攻" className={styles.statIcon} />
                        {stat.assists}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {videoRecord && (
              <div className={styles.videoSection}>
                <h2 className={styles.videoTitle}>
                  <img src="/video.svg" alt="录像" className={styles.videoTitleIcon} />
                  比赛录像
                </h2>
                <div className={styles.videoCard}>
                  <div className={styles.videoInfo}>
                    <div className={styles.videoName}>{videoRecord.fileName}</div>
                    <div className={styles.videoDesc}>{videoRecord.description}</div>
                  </div>
                  <div className={styles.videoLinks}>
                    {videoRecord.url && (
                      <a 
                        href={videoRecord.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.videoLink}
                      >
                        <img src="/link.svg" alt="链接" className={styles.linkIcon} />
                        观看录像
                      </a>
                    )}
                    {videoRecord.extractCode && (
                      <div className={styles.extractCode}>
                        <span className={styles.codeLabel}>提取码:</span>
                        <span className={styles.codeValue}>{videoRecord.extractCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}