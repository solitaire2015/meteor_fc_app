'use client'

import Head from 'next/head'
import Link from 'next/link'
import { Mulish } from 'next/font/google'
import { useState } from 'react'
import styles from '../styles/GameDetails.module.css'

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

// Type definitions for better type safety
interface Player {
  id: number;
  name: string;
  section1: (number | string)[];
  section2: (number | string)[];
  section3: (number | string)[];
  total: number;
  cost: number;
  fieldFee: number;
  onTime: boolean;
  videoCost: number;
  totalCost: number;
  notes: string;
}

// Helper functions to calculate derived values
const calculateLateFee = (onTime: boolean, total: number): number => {
  // Only charge late fee if player attended (total > 0) and was late
  return (total > 0 && !onTime) ? 10 : 0;
};

const calculateTotalCost = (fieldFee: number, onTime: boolean, videoCost: number, total: number): number => {
  const lateFee = calculateLateFee(onTime, total);
  return fieldFee + lateFee + videoCost;
};

const getLateStatus = (onTime: boolean, total: number): string => {
  if (total === 0) return '未参加';  // Did not attend
  return onTime ? '准时到场' : '迟到';
};

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

interface GameDetailsProps {
  title?: string;
  subtitle?: string;
  gameData?: Player[];
  gameStats?: GameStat[];
  videoRecord?: VideoRecord;
  gameSummary?: GameSummary;
}

// Default data for development
const defaultGameData: Player[] = [
  { id: 1, name: "东辉", section1: [1, 1, 1], section2: [0, 0, 1], section3: [0, 0, 0], total: 4, cost: 12.7778, fieldFee: 51, onTime: true, videoCost: 54, totalCost: 105, notes: "" },
  { id: 2, name: "超", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: false, videoCost: 0, totalCost: 0, notes: "观战" },
  { id: 3, name: "卜", section1: [1, 1, 1], section2: [0, 0, 0], section3: [1, 1, 1], total: 6, cost: 12.7778, fieldFee: 77, onTime: true, videoCost: 81, totalCost: 158, notes: "" },
  { id: 4, name: "马", section1: [1, 1, 1], section2: [0, 0, 0], section3: [1, 1, 1], total: 6, cost: 12.7778, fieldFee: 77, onTime: true, videoCost: 121, totalCost: 198, notes: "进球1" },
  { id: 5, name: "得瑞克", section1: [0, 1, 1], section2: [1, 0, 0], section3: [1, 1, 1], total: 6, cost: 12.7778, fieldFee: 77, onTime: true, videoCost: 81, totalCost: 158, notes: "进球1 助攻1" },
  { id: 6, name: "孙叔", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 0, 0], total: 3, cost: 12.7778, fieldFee: 38, onTime: true, videoCost: 40, totalCost: 78, notes: "" },
  { id: 7, name: "小朱", section1: [1, 1, 1], section2: [0, 0, 0], section3: [1, 0.5, 0], total: 4.5, cost: 12.7778, fieldFee: 58, onTime: true, videoCost: 129, totalCost: 187, notes: "" },
  { id: 8, name: "陶叔", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 0.5, 1], total: 4.5, cost: 12.7778, fieldFee: 58, onTime: true, videoCost: 61, totalCost: 119, notes: "" },
  { id: 9, name: "林达（试训）", section1: [0, 0, 0], section2: [0, 1, 1], section3: [1, 1, 1], total: 5, cost: 12.7778, fieldFee: 64, onTime: true, videoCost: 0, totalCost: 64, notes: "小朱代缴" },
  { id: 10, name: "qc", section1: [0, 0, 0.5], section2: [0, 0, 0], section3: [1, 0, 0], total: 1.5, cost: 12.7778, fieldFee: 19, onTime: true, videoCost: 20, totalCost: 39, notes: "" },
  { id: 11, name: "刘畅", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 0, 0], total: 3, cost: 12.7778, fieldFee: 38, onTime: true, videoCost: 40, totalCost: 78, notes: "" },
  { id: 12, name: "王拓", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 0, 0], total: 3, cost: 12.7778, fieldFee: 38, onTime: true, videoCost: 40, totalCost: 78, notes: "" },
  { id: 13, name: "王涛", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: true, videoCost: 0, totalCost: 0, notes: "" },
  { id: 14, name: "老狼", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: true, videoCost: 0, totalCost: 0, notes: "" },
  { id: 15, name: "小冷", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: false, videoCost: 0, totalCost: 0, notes: "观战" },
  { id: 16, name: "天籁", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: true, videoCost: 0, totalCost: 0, notes: "" },
  { id: 17, name: "戴", section1: [1, 1, 1], section2: [0, 0, 0], section3: [0, 0, 0], total: 3, cost: 12.7778, fieldFee: 38, onTime: true, videoCost: 40, totalCost: 78, notes: "" },
  { id: 18, name: "陶", section1: [1, 1, 0.5], section2: [0, 0, 0], section3: [1, 1, 1], total: 5.5, cost: 12.7778, fieldFee: 70, onTime: true, videoCost: 74, totalCost: 144, notes: "" },
  { id: 19, name: "狗哥", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 0, 0], total: 3, cost: 12.7778, fieldFee: 38, onTime: true, videoCost: 40, totalCost: 78, notes: "" },
  { id: 20, name: "龙龙", section1: [1, 1, 1], section2: [0, 0, 0], section3: [1, 0, 0], total: 4, cost: 12.7778, fieldFee: 51, onTime: true, videoCost: 54, totalCost: 105, notes: "" },
  { id: 21, name: "贾", section1: [1, 1, 1], section2: [0, 0, 0], section3: [1, 1, 1], total: 6, cost: 12.7778, fieldFee: 77, onTime: true, videoCost: 81, totalCost: 158, notes: "" },
  { id: 22, name: "孔", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 0, 0], total: 3, cost: 12.7778, fieldFee: 38, onTime: true, videoCost: 40, totalCost: 78, notes: "" },
  { id: 23, name: "小赵", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 1, 1], total: 5, cost: 12.7778, fieldFee: 64, onTime: true, videoCost: 68, totalCost: 132, notes: "" },
  { id: 24, name: "鲁", section1: [0, 0, 0], section2: [0, 0, 0], section3: [1, 1, 1], total: 3, cost: 12.7778, fieldFee: 38, onTime: false, videoCost: 0, totalCost: 48, notes: "马代缴 进球1" },
  { id: 25, name: "刀哥", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: false, videoCost: 0, totalCost: 0, notes: "观战" },
  { id: 26, name: "李玉衡", section1: ["守门", "守门", "守门"], section2: ["守门", "守门", "守门"], section3: ["守门", "守门", "守门"], total: 0, cost: 12.7778, fieldFee: 0, onTime: true, videoCost: 0, totalCost: 0, notes: "" },
  { id: 27, name: "五魁", section1: [0, 0, 0], section2: [1, 1, 0], section3: [0, 0, 0], total: 2, cost: 12.7778, fieldFee: 26, onTime: true, videoCost: 28, totalCost: 54, notes: "" },
  { id: 28, name: "阔爷", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: false, videoCost: 0, totalCost: 0, notes: "观战" },
  { id: 29, name: "小刘", section1: [0, 0, 0], section2: [1, 1, 1], section3: [0, 0, 0], total: 3, cost: 12.7778, fieldFee: 38, onTime: true, videoCost: 40, totalCost: 78, notes: "" },
  { id: 30, name: "一只", section1: [0, 0, 0], section2: [0, 0, 0], section3: [0, 0, 0], total: 0, cost: 12.7778, fieldFee: 0, onTime: false, videoCost: 0, totalCost: 0, notes: "观战" },
  { id: 31, name: "袁", section1: [1, 1, 1], section2: [0, 0, 0], section3: [1, 1, 1], total: 6, cost: 12.7778, fieldFee: 77, onTime: false, videoCost: 91, totalCost: 178, notes: "助攻1" }
];

const defaultGameStats: GameStat[] = [
  { name: "马", goals: 1, assists: 0 },
  { name: "得瑞克", goals: 1, assists: 1 },
  { name: "鲁", goals: 1, assists: 0 },
  { name: "袁", goals: 0, assists: 1 }
];

const defaultVideoRecord: VideoRecord = {
  fileName: "20250824VS十七苝",
  description: "通过网盘分享的文件",
  url: "https://pan.baidu.com/s/1lPcP2GJ35HuVD4L07mr9_Q?pwd=u3h2",
  extractCode: "u3h2"
};

const defaultGameSummary: GameSummary = {
  totalFieldCost: 1150.00,
  totalActualCost: 1223,
  fieldCostNote: "场地1100+水费50"
};

export default function GameDetails({ 
  title = "8月23日VS十七苝",
  subtitle = "进球助攻 3:5", 
  gameData = defaultGameData,
  gameStats = defaultGameStats,
  videoRecord = defaultVideoRecord,
  gameSummary = defaultGameSummary
}: GameDetailsProps) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (playerId: number) => {
    setExpandedRows(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const renderSection = (sectionData: (string | number)[]) => {
    return (
      <div className={styles.sectionGroup}>
        {sectionData.map((value: string | number, partIndex: number) => (
          <div 
            key={partIndex}
            className={`${styles.sectionPart} ${
              Number(value) === 1 ? styles.full : 
              Number(value) === 0.5 ? styles.half : 
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
              <Link href="/">
                <img src="/back.svg" alt="返回" className={styles.backIcon} />
                返回
              </Link>
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
                  <a 
                    href={videoRecord.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.videoLink}
                  >
                    <img src="/link.svg" alt="链接" className={styles.linkIcon} />
                    观看录像
                  </a>
                  <div className={styles.extractCode}>
                    <span className={styles.codeLabel}>提取码:</span>
                    <span className={styles.codeValue}>{videoRecord.extractCode}</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}