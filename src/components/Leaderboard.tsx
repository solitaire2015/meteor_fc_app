'use client'

import Head from 'next/head'
import { Mulish } from 'next/font/google'
import { useState, useRef, useEffect } from 'react'
import styles from '../styles/Leaderboard.module.css'

const mulish = Mulish({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

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

export default function Leaderboard({ 
  subtitle = "Champions League", 
  players = defaultPlayers
}) {
  const [activeTab, setActiveTab] = useState(0)
  const tabsRef = useRef(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const tabs = ['射手榜', '助攻榜']

  // Sort all players based on active tab
  const getSortedPlayers = () => {
    const sortKey = activeTab === 0 ? 'goals' : 'assists'
    return [...players].sort((a, b) => b[sortKey] - a[sortKey]).map((player, index) => ({
      ...player,
      position: index + 1
    }))
  }

  const sortedPlayers = getSortedPlayers()
  const podiumPlayers = sortedPlayers.slice(0, 3).map((player, index) => ({
    ...player,
    rank: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'
  }))
  const listPlayers = sortedPlayers.slice(3)

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
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
    <>
      <Head>
        <title>{`${tabs[activeTab]} - Team Colors`}</title>
        <meta name="description" content="Football club leaderboard" />
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
            
            {/* Tabbed Navigation */}
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
            <div 
              className={styles.contentContainer}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <section className={styles.podium}>
                {podiumPlayers.map((player, index) => (
                  <div key={player.id} className={`${styles.podiumItem} ${styles[player.rank]}`}>
                    <div className={styles.podiumPlayerContainer}>
                      <div className={styles.rank}>{player.position}</div>
                      <div className={styles.playerImg}>{player.initials}</div>
                    </div>
                    <div className={styles.name}>{player.name}</div>
                    {/* <div className={styles.team}>{player.team}</div> */}
                    <div className={styles.goals}>{player[currentStat]}</div>
                  </div>
                ))}
              </section>

              <section className={styles.scorersList}>
                {listPlayers.map((player) => (
                  <div key={player.id} className={styles.listItem}>
                    <div className={styles.rank}>{player.position}</div>
                    <div className={styles.playerInfo}>
                      <div className={styles.playerImg}>{player.initials}</div>
                      <div className={styles.details}>
                        <div className={styles.name}>{player.name}</div>
                        {/* <div className={styles.team}>{player.team}</div> */}
                      </div>
                    </div>
                    <div className={styles.goals}>{player[currentStat]}</div>
                  </div>
                ))}
              </section>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

