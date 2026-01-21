
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

const DEFAULT_SETTINGS = [
    { key: 'DEFAULT_FIELD_FEE', value: '1100', description: '默认单次比赛场地费' },
    { key: 'DEFAULT_WATER_FEE', value: '50', description: '默认单次比赛杂费（水费等）' },
    { key: 'LATE_FEE_RATE', value: '10', description: '默认迟到罚款金额' },
    { key: 'VIDEO_FEE_RATE', value: '2', description: '默认视频剪辑费用率（每时段）' },
]

async function main() {
    // Find an admin user to attribute the settings to
    const admin = await prisma.user.findFirst({
        where: { userType: 'ADMIN' }
    })

    if (!admin) {
        console.error('No admin user found. Please create an admin user first.')
        return
    }

    console.log(`Using admin user: ${admin.name} (${admin.id})`)

    for (const setting of DEFAULT_SETTINGS) {
        const existing = await prisma.systemConfig.findUnique({
            where: { key: setting.key }
        })

        if (!existing) {
            await prisma.systemConfig.create({
                data: {
                    ...setting,
                    updatedBy: admin.id
                }
            })
            console.log(`Initialized setting: ${setting.key} = ${setting.value}`)
        } else {
            console.log(`Setting already exists: ${setting.key}`)
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
