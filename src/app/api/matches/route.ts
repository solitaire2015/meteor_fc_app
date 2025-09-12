import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, validationError } from '@/lib/apiResponse'
import { CreateMatchSchema, PaginationSchema, validateRequest } from '@/lib/validationSchemas'

const prisma = new PrismaClient()

// GET /api/matches - List all matches with pagination
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

    // Get total count for pagination
    const total = await prisma.match.count()
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    // Fetch matches with pagination
    const matches = await prisma.match.findMany({
      skip,
      take: limit,
      orderBy: { matchDate: 'desc' },
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
        totalParticipants: true,
        totalGoals: true,
        totalAssists: true,
        totalCalculatedFees: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return successResponse(matches, {
      page,
      limit,
      total,
      totalPages
    })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return errorResponse('Failed to fetch matches')
  }
}

// POST /api/matches - Create a new match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateRequest(CreateMatchSchema, body)

    if (!validation.success) {
      return validationError(validation.error, validation.details)
    }

    const matchData = validation.data

    // Determine match result if scores are provided
    let matchResult = null
    if (matchData.ourScore !== undefined && matchData.opponentScore !== undefined) {
      if (matchData.ourScore > matchData.opponentScore) {
        matchResult = 'WIN'
      } else if (matchData.ourScore < matchData.opponentScore) {
        matchResult = 'LOSE'
      } else {
        matchResult = 'DRAW'
      }
    }

    // Create match
    const match = await prisma.match.create({
      data: {
        ...matchData,
        matchResult,
        totalParticipants: 0,
        totalGoals: 0,
        totalAssists: 0,
        totalCalculatedFees: 0,
        status: 'SCHEDULED'
      },
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
        totalParticipants: true,
        totalGoals: true,
        totalAssists: true,
        totalCalculatedFees: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return successResponse(match)
  } catch (error) {
    console.error('Error creating match:', error)
    return errorResponse('Failed to create match')
  }
}