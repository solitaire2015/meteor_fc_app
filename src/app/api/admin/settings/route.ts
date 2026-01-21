import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedError } from '@/lib/apiResponse'

const prisma = new PrismaClient()

// Default settings to initialize if they don't exist
const DEFAULT_SETTINGS = [
    { key: 'DEFAULT_FIELD_FEE', value: '1100', description: '默认单次比赛场地费' },
    { key: 'DEFAULT_WATER_FEE', value: '50', description: '默认单次比赛杂费（水费等）' },
    { key: 'LATE_FEE_RATE', value: '10', description: '默认迟到罚款金额' },
    { key: 'VIDEO_FEE_RATE', value: '2', description: '默认视频剪辑费用率（每时段）' },
]

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.userType !== 'ADMIN') {
            return unauthorizedError()
        }

        const settings = await prisma.systemConfig.findMany({
            orderBy: { key: 'asc' }
        })

        // If settings are empty, we might want to return defaults or empty list
        // For now, return what's in the DB
        return successResponse(settings)
    } catch (error) {
        console.error('Failed to fetch settings:', error)
        return errorResponse('Internal Server Error')
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.userType !== 'ADMIN') {
            return unauthorizedError()
        }

        const { settings } = await request.json()
        if (!Array.isArray(settings)) {
            return errorResponse('Invalid settings data', 'INVALID_DATA', 400)
        }

        const updatedSettings = []

        for (const setting of settings) {
            const { key, value, description } = setting
            if (!key) continue

            const updated = await prisma.systemConfig.upsert({
                where: { key },
                update: {
                    value: String(value),
                    description,
                    updatedBy: session.user.id
                },
                create: {
                    key,
                    value: String(value),
                    description,
                    updatedBy: session.user.id
                }
            })
            updatedSettings.push(updated)
        }

        return successResponse(updatedSettings)
    } catch (error) {
        console.error('Failed to update settings:', error)
        return errorResponse('Internal Server Error')
    }
}
