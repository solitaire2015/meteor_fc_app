import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create players first
  const players = await Promise.all([
    prisma.player.create({
      data: {
        name: "小陶",
        initials: "XT",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "得瑞克",
        initials: "DRK",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "小贾",
        initials: "XJ",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "肖老师",
        initials: "XLS",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "曦哥",
        initials: "XG",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "小马",
        initials: "XM",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "小刘",
        initials: "XL",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "小罗",
        initials: "XR",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "元帅",
        initials: "YS",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "老狼",
        initials: "LL",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "大赵",
        initials: "DZ",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "东辉",
        initials: "DH",
        team: "Football Club"
      }
    }),
    prisma.player.create({
      data: {
        name: "冷",
        initials: "L",
        team: "Football Club"
      }
    })
  ])

  console.log(`Created ${players.length} players`)

  // Create sample games
  const game1 = await prisma.game.create({
    data: {
      date: new Date('2025-08-23'),
      opponent: "十七苝",
      result: "3:5",
      status: "FINISHED"
    }
  })

  const game2 = await prisma.game.create({
    data: {
      date: new Date('2025-08-16'),
      opponent: "FYL",
      result: "2:1",
      status: "FINISHED"
    }
  })

  const game3 = await prisma.game.create({
    data: {
      date: new Date('2025-08-30'),
      opponent: "飞鹰",
      result: "--",
      status: "UPCOMING"
    }
  })

  console.log('Created 3 sample games')

  // Create sample game player stats for game1
  await prisma.gamePlayer.createMany({
    data: [
      {
        gameId: game1.id,
        playerId: players[0].id, // 小陶
        goals: 2,
        assists: 1,
        section1: 1,
        section2: 1,
        section3: 0.5,
        total: 2.5,
        fieldFee: 64,
        onTime: true,
        videoCost: 68,
        totalCost: 132,
        notes: "进球2"
      },
      {
        gameId: game1.id,
        playerId: players[1].id, // 得瑞克
        goals: 1,
        assists: 2,
        section1: 1,
        section2: 1,
        section3: 1,
        total: 3,
        fieldFee: 77,
        onTime: true,
        videoCost: 81,
        totalCost: 158,
        notes: "进球1 助攻2"
      }
    ]
  })

  console.log('Created sample game player stats')

  // Create monthly stats
  await prisma.monthlyStats.createMany({
    data: [
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
      }
    ]
  })

  console.log('Created monthly stats')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })