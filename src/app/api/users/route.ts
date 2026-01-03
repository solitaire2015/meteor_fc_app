import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { ApiResponse, successResponse, errorResponse, validationError } from '@/lib/apiResponse'
import { CreateUserSchema, PaginationSchema, validateRequest } from '@/lib/validationSchemas'
import { buildCacheKey, CACHE_TAGS, getCachedJson, setCachedJson, invalidateCacheTags } from '@/lib/cache'

const prisma = new PrismaClient()

// GET /api/users - List all users with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paginationValidation = validateRequest(PaginationSchema, {
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    })

    if (!paginationValidation.success) {
      return validationError(paginationValidation.error, paginationValidation.details)
    }

    const { page, limit } = paginationValidation.data
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const cacheKey = buildCacheKey(new URL(request.url))
    const cached = await getCachedJson<ApiResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Build where clause based on deletion status
    const whereClause = includeDeleted ? {} : { deletedAt: null }

    // Get total count for pagination
    const total = await prisma.user.count({ where: whereClause })
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    // Fetch users with pagination
    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [
        { deletedAt: 'asc' }, // Active users first (null values first)
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
        email: true,
        phone: true,
        userType: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deletedBy: true,
        deletionReason: true
      }
    })

    const payload = {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        includeDeleted
      }
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.USERS]
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching users:', error)
    return errorResponse('Failed to fetch users')
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateRequest(CreateUserSchema, body)

    if (!validation.success) {
      return validationError(validation.error, validation.details)
    }

    const userData = validation.data

    // Check for unique jersey number if provided
    if (userData.jerseyNumber) {
      const existingUser = await prisma.user.findFirst({
        where: { jerseyNumber: userData.jerseyNumber }
      })
      
      if (existingUser) {
        return validationError('Jersey number already exists', {
          field: 'jerseyNumber',
          value: userData.jerseyNumber
        })
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        ...userData,
        accountStatus: 'ACTIVE',
        shortId: await generateShortId()
      },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
        email: true,
        phone: true,
        userType: true,
        accountStatus: true,
        shortId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    await invalidateCacheTags([
      CACHE_TAGS.USERS,
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return successResponse(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return errorResponse('Failed to create user')
  }
}

// Helper function to generate unique short ID
async function generateShortId(): Promise<string> {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let shortId: string
  let isUnique = false

  do {
    shortId = ''
    for (let i = 0; i < 4; i++) {
      shortId += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const existing = await prisma.user.findFirst({
      where: { shortId }
    })
    isUnique = !existing
  } while (!isUnique)

  return shortId
}
