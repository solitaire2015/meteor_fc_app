import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  userType: z.enum(['ADMIN', 'PLAYER']).default('PLAYER'),
  accountStatus: z.enum(['GHOST', 'CLAIMED']).default('GHOST'),
  jerseyNumber: z.number().int().positive().optional(),
  position: z.enum(['GK', 'DF', 'MF', 'FW']).optional(),
  dominantFoot: z.enum(['LEFT', 'RIGHT', 'BOTH']).optional(),
  introduction: z.string().optional(),
  joinDate: z.string().datetime().optional(),
  createdBy: z.string().optional()
})

// GET /api/players - Get all users (players) with calculated stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userType = searchParams.get('userType') || 'PLAYER'
    const accountStatus = searchParams.get('accountStatus')

    const where: any = { userType }
    if (accountStatus) {
      where.accountStatus = accountStatus
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        participations: {
          include: {
            match: true
          }
        },
        events: {
          include: {
            match: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calculate statistics for each user
    const transformedUsers = users.map(user => {
      // Calculate goals and assists from events
      const goals = user.events.filter(event => 
        event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL'
      ).length
      
      const assists = user.events.filter(event => 
        event.eventType === 'ASSIST'
      ).length

      const ownGoals = user.events.filter(event => 
        event.eventType === 'OWN_GOAL'
      ).length

      const yellowCards = user.events.filter(event => 
        event.eventType === 'YELLOW_CARD'
      ).length

      const redCards = user.events.filter(event => 
        event.eventType === 'RED_CARD'
      ).length

      const penalties = user.events.filter(event => 
        event.eventType === 'PENALTY_GOAL'
      ).length

      const saves = user.events.filter(event => 
        event.eventType === 'SAVE'
      ).length

      // Calculate appearances (unique matches with participation)
      const appearances = user.participations.length

      // Calculate total playing time
      const totalTime = user.participations.reduce((sum, p) => {
        return sum + Number(p.section1Part1) + Number(p.section1Part2) + Number(p.section1Part3) +
                     Number(p.section2Part1) + Number(p.section2Part2) + Number(p.section2Part3) +
                     Number(p.section3Part1) + Number(p.section3Part2) + Number(p.section3Part3)
      }, 0)

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        accountStatus: user.accountStatus,
        jerseyNumber: user.jerseyNumber,
        position: user.position,
        dominantFoot: user.dominantFoot,
        avatarUrl: user.avatarUrl,
        introduction: user.introduction,
        joinDate: user.joinDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Statistics
        goals,
        assists,
        ownGoals,
        yellowCards,
        redCards,
        penalties,
        saves,
        appearances,
        totalTime: Number(totalTime.toFixed(1))
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedUsers
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'SERVER_ERROR',
        message: 'Failed to fetch users' 
      } 
    }, { status: 500 })
  }
}

// POST /api/players - Create a new user (ghost player)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // For ghost accounts, only name is required
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        userType: validatedData.userType,
        accountStatus: validatedData.accountStatus,
        jerseyNumber: validatedData.jerseyNumber,
        position: validatedData.position,
        dominantFoot: validatedData.dominantFoot,
        introduction: validatedData.introduction,
        joinDate: validatedData.joinDate ? new Date(validatedData.joinDate) : new Date(),
        createdBy: validatedData.createdBy
      }
    })

    return NextResponse.json({
      success: true,
      data: user
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, { status: 400 })
    }

    console.error('Error creating user:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create user'
      }
    }, { status: 500 })
  }
}