import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { ApiResponse } from '@/lib/apiResponse'
import { buildCacheKey, CACHE_TAGS, getCachedJson, invalidateCacheTags, setCachedJson } from '@/lib/cache'

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortId: z.string().max(10).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  userType: z.enum(['ADMIN', 'PLAYER']).default('PLAYER'),
  accountStatus: z.enum(['GHOST', 'CLAIMED']).default('GHOST'),
  playerStatus: z.enum(['REGULAR', 'TRIAL', 'VACATION']).default('REGULAR'),
  jerseyNumber: z.number().int().positive().optional(),
  position: z.enum([
    'GK',
    'CB', 'LB', 'RB', 'LWB', 'RWB',
    'DMF', 'CMF', 'AMF', 'LMF', 'RMF',
    'CF', 'ST', 'SS', 'LWF', 'RWF'
  ]).optional(),
  dominantFoot: z.enum(['LEFT', 'RIGHT', 'BOTH']).optional(),
  introduction: z.string().optional(),
  joinDate: z.string().datetime().optional(),
  createdBy: z.string().optional()
})

type CreateUserInput = z.infer<typeof createUserSchema>

// GET /api/players - Get all users (players and admins) with calculated stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userType = searchParams.get('userType') // No default filter - include all users
    const accountStatus = searchParams.get('accountStatus')
    const isPublic = searchParams.get('public') === 'true'
    const includeDeleted = !isPublic && searchParams.get('includeDeleted') === 'true'

    const cacheKey = buildCacheKey(new URL(request.url))
    const cached = await getCachedJson<ApiResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const where: Prisma.UserWhereInput = {}

    // Only filter by userType if explicitly requested
    if (userType) {
      where.userType = userType as any
    }

    if (accountStatus) {
      where.accountStatus = accountStatus as any
    }

    // Filter out deleted users by default
    if (!includeDeleted) {
      where.deletedAt = null
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        participations: {
          include: {
            match: {
              select: {
                id: true,
                matchDate: true,
                matchTime: true,
                opponentTeam: true,
                ourScore: true,
                opponentScore: true,
                matchResult: true,
                fieldFeeTotal: true,
                waterFeeTotal: true,
                notes: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        },
        events: {
          include: {
            match: {
              select: {
                id: true,
                matchDate: true,
                matchTime: true,
                opponentTeam: true,
                ourScore: true,
                opponentScore: true,
                matchResult: true,
                fieldFeeTotal: true,
                waterFeeTotal: true,
                notes: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      },
      orderBy: [
        { deletedAt: 'asc' }, // Active users first (null values first)
        { name: 'asc' }
      ]
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

      // Calculate total playing time using the field in MatchParticipation
      const totalTime = user.participations.reduce((sum, p) => {
        return sum + Number(p.totalTime)
      }, 0)

      const publicPayload = {
        id: user.id,
        name: user.name,
        jerseyNumber: user.jerseyNumber,
        position: user.position,
        avatarUrl: user.avatarUrl,
        playerStatus: (user as any).playerStatus,
        goals,
        assists,
        appearances,
        totalTime: Number(totalTime.toFixed(1))
      }

      if (isPublic) {
        return publicPayload
      }

      return {
        id: user.id,
        name: user.name,
        shortId: user.shortId,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        accountStatus: user.accountStatus,
        playerStatus: (user as any).playerStatus,
        jerseyNumber: user.jerseyNumber,
        position: user.position,
        dominantFoot: user.dominantFoot,
        avatarUrl: user.avatarUrl,
        introduction: user.introduction,
        joinDate: user.joinDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Soft delete fields
        deletedAt: user.deletedAt,
        deletedBy: user.deletedBy,
        deletionReason: user.deletionReason,
        // Statistics
        goals,
        assists,
        ownGoals,
        yellowCards,
        redCards,
        penalties,
        saves,
        appearances,
        totalTime: Number(totalTime.toFixed(1)),
        // Password status (for admin UI)
        hasPassword: !!user.passwordHash
      }
    })

    const payload = {
      success: true,
      data: transformedUsers
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.PLAYERS]
    })

    return NextResponse.json(payload)
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
  let validatedData: CreateUserInput | null = null

  try {
    const body = await request.json()
    validatedData = createUserSchema.parse(body)

    // For ghost accounts, only name is required
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        shortId: validatedData.shortId,
        email: validatedData.email,
        phone: validatedData.phone,
        userType: validatedData.userType as any,
        accountStatus: validatedData.accountStatus as any,
        playerStatus: validatedData.playerStatus as any,
        jerseyNumber: validatedData.jerseyNumber,
        position: validatedData.position,
        dominantFoot: validatedData.dominantFoot,
        introduction: validatedData.introduction,
        joinDate: validatedData.joinDate ? new Date(validatedData.joinDate) : new Date(),
        createdBy: validatedData.createdBy
      }
    })

    await invalidateCacheTags([
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.USERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return NextResponse.json({
      success: true,
      data: user
    })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        }
      }, { status: 400 })
    }

    // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = error.meta?.target as string[]
        const fieldName = field?.[0] || 'field'

        const friendlyMessages = {
          shortId: `球员代码 "${validatedData?.shortId || ''}" 已被使用，请选择其他代码`,
          email: `邮箱地址 "${validatedData?.email || ''}" 已被使用，请选择其他邮箱`,
          phone: `手机号码 "${validatedData?.phone || ''}" 已被使用，请选择其他号码`
        }

        const message = friendlyMessages[fieldName as keyof typeof friendlyMessages] ||
          `该 ${fieldName} 已被使用，请选择其他值`

        return NextResponse.json({
          success: false,
          error: {
            code: 'DUPLICATE_ERROR',
            message,
            field: fieldName
          }
        }, { status: 409 })
      }
    }

    // Generic server error
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
