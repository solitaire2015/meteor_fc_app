/**
 * Initialize Global Settings Script
 * 
 * Run this script to create the initial global settings in the database.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Initializing global settings...')
  
  try {
    const defaultSettings = [
      {
        key: 'base_video_fee_rate',
        value: '2',
        dataType: 'decimal',
        description: 'Base video fee rate per unit for new matches',
        category: 'fees'
      },
      {
        key: 'base_late_fee_rate',
        value: '10',
        dataType: 'decimal',
        description: 'Base late arrival fee rate for new matches',
        category: 'fees'
      }
    ]

    for (const setting of defaultSettings) {
      const result = await prisma.globalSetting.upsert({
        where: { key: setting.key },
        update: {
          // Don't overwrite existing values, only update metadata
          dataType: setting.dataType,
          description: setting.description,
          category: setting.category
        },
        create: setting
      })
      console.log(`✅ Created/updated setting: ${setting.key} = ${result.value}`)
    }
    
    console.log('✅ Global settings initialized successfully!')
    
    // Verify the settings were created
    const allSettings = await prisma.globalSetting.findMany({
      where: {
        category: 'fees'
      }
    })
    
    console.log('📊 Current fee settings:')
    allSettings.forEach(setting => {
      console.log(`  - ${setting.key}: ${setting.value} (${setting.description})`)
    })
    
  } catch (error) {
    console.error('❌ Failed to initialize global settings:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })