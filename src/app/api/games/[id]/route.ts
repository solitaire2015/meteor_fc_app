import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const match = await prisma.match.findUnique({
      where: {
        id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          }
        },
        participations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                jerseyNumber: true,
                position: true,
              }
            }
          }
        },
        events: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                jerseyNumber: true,
              }
            }
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Match not found'
        }
      }, { status: 404 })
    }

    // Calculate statistics from events
    const goals = match.events.filter(e => e.eventType === 'GOAL').length
    const assists = match.events.filter(e => e.eventType === 'ASSIST').length
    const participants = match.participations.length

    // Calculate fees
    const totalCalculatedFees = Math.round(
      match.fieldFeeTotal + match.waterFeeTotal + (participants * match.feeCoefficient)
    )

    const matchData = {
      ...match,
      totalParticipants: participants,
      totalGoals: goals,
      totalAssists: assists,
      totalCalculatedFees,
    }

    return NextResponse.json({
      success: true,
      data: matchData
    })

  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const updatedMatch = await prisma.match.update({
      where: {
        id,
      },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedMatch
    })

  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Delete related data first
    await prisma.event.deleteMany({
      where: { matchId: id }
    })

    await prisma.participation.deleteMany({
      where: { matchId: id }
    })

    // Delete the match
    await prisma.match.delete({
      where: {
        id,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Match deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting match:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}