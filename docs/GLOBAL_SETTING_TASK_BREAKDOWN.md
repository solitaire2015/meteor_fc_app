📋 Final Task Breakdown

  Task 1: Database Schema - Global Settings Table

  CREATE TABLE global_settings (
    id          String    @id @default(cuid())
    key         String    @unique
    value       String
    dataType    String
    description String?
    category    String
    updatedAt   DateTime  @updatedAt
  )
  Initial records to create:
  - base_video_fee_rate: "2" (dataType: "decimal", category: "fees")
  - base_late_fee_rate: "10" (dataType: "decimal", category: "fees")

  Task 2: Update APIs That Create Matches

  APIs to modify:
  1. /api/games (POST) - Line 230: const lateFee = validatedParticipation.isLate ? 10 : 0
  2. /api/admin/excel/import (POST) - Uses calculatePlayerFees which calls hardcoded values
  3. src/lib/feeCalculation.ts - Line 84: const lateFee = isLateArrival ? 10 : 0; and line 86: const 
  videoFee = Math.ceil(normalPlayerParts / 3 * 2);

  Changes needed:
  - Create a global settings service to read from database
  - Update match creation to set match.lateFeeRate and match.videoFeePerUnit from global settings
  - Keep existing fee calculation logic unchanged (it already uses match-specific rates)

  Task 3: Database Migration Script

  UPDATE matches SET
    videoFeePerUnit = 2.00,
    lateFeeRate = 10.00
  WHERE videoFeePerUnit IS NULL OR lateFeeRate IS NULL;

  Task 5: Migration & Testing

  - Test match creation reads global settings
  - Test Excel import reads global settings
  - Test existing fee calculations still work
  - Fallback to hardcoded defaults (2, 10) if global settings missing

  🎯 Key Points Confirmed:

  1. No admin UI needed this time - just the database layer
  2. Excel import does create matches - it calls prisma.match.create() at line 95
  3. The fee calculation logic in feeCalculation.ts has hardcoded values that need to be replaced
  4. Match creation in /api/games also has hardcoded late fee