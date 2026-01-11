import { PrismaClient, User } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// JSON Schema Types
interface MatchFile {
  sheets?: Sheet[];
  meta?: SheetMeta;
  players?: PlayerData[];
}

interface Sheet {
  meta: SheetMeta;
  players: PlayerData[];
}

interface SheetMeta {
  sheetName: string;
  matchScore: string;
  fees: {
    pitchFee: number;
    waterFee: number;
  };
}

interface PlayerData {
  shortId: string;
  name: string;
  isGoalie: boolean;
  totalTime: number;
  segments: {
    q1: (string | number | null)[];
    q2: (string | number | null)[];
    q3: (string | number | null)[];
  };
  late: {
    status: string;
    fine: number;
  };
  stats: {
    goals: number;
    assists: number;
  };
  remarks: string;
}

// Helper to parse date and opponent from "12月27号VS新新联"
function parseMeta(sheetName: string, defaultYear: number = 2025) {
  // Normalize
  const normalized = sheetName.replace(/\s+/g, '').replace(/Vs/g, 'VS').replace(/vs/g, 'VS');
  
  // Extract Date: Look for digits followed by 月 and digits followed by 号/日
  // Example: 12月27号...
  const dateRegex = /(\d{1,2})月(\d{1,2})[号日]/;
  const dateMatch = normalized.match(dateRegex);
  
  let matchDate = new Date();
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);
    matchDate = new Date(defaultYear, month - 1, day);
    // If the date is in the future relative to today (and we are assuming past games), 
    // maybe substract a year? 
    // For now, let's stick to defaultYear which we can configure.
  }

  // Extract Opponent: Anything after "VS"
  const vsIndex = normalized.indexOf('VS');
  let opponent = 'Unknown';
  if (vsIndex !== -1) {
    opponent = normalized.substring(vsIndex + 2);
  } else {
    // Fallback: try to guess if no VS?
    // User said "Opponent follows VS".
  }

  if (!opponent) opponent = 'Unknown Team';

  return { matchDate, opponent };
}

function parseScore(scoreStr: string) {
  // "2:2" or "3:6"
  const parts = scoreStr.split(/[:：]/); // Handle full-width colon too
  if (parts.length === 2) {
    return {
      ourScore: parseInt(parts[0], 10) || 0,
      opponentScore: parseInt(parts[1], 10) || 0,
    };
  }
  return { ourScore: 0, opponentScore: 0 };
}

async function getAdminUser() {
  // Try to find an ADMIN
  const admin = await prisma.user.findFirst({
    where: { userType: 'ADMIN' },
  });
  if (admin) return admin;

  // Fallback to any user
  const anyUser = await prisma.user.findFirst();
  if (anyUser) return anyUser;

  throw new Error('No users found in database to assign as creator.');
}

// Helper for fee calculation
function calculateCoefficient(fieldFeeTotal: number, waterFeeTotal: number) {
  const FIXED_TOTAL_TIME_UNITS = 90;
  return (fieldFeeTotal + waterFeeTotal) / FIXED_TOTAL_TIME_UNITS;
}

function calculatePlayerFees(
  attendanceData: any, 
  isLateArrival: boolean, 
  feeCoefficient: number,
  lateFeeRate: number = 10,
  videoFeeRate: number = 2
) {
  let normalPlayerParts = 0;
  
  for (let section = 1; section <= 3; section++) {
    for (let part = 1; part <= 3; part++) {
      const sectionStr = section.toString();
      const partStr = part.toString();
      
      const attendance = attendanceData.attendance[sectionStr]?.[partStr] || 0;
      const isGoalkeeper = attendanceData.goalkeeper[sectionStr]?.[partStr] || false;
      
      if (attendance > 0 && !isGoalkeeper) {
        normalPlayerParts += attendance;
      }
    }
  }
  
  const fieldFee = Number((normalPlayerParts * feeCoefficient).toFixed(2));
  const lateFee = isLateArrival ? Number(lateFeeRate) : 0;
  const videoFee = Number(Math.ceil(normalPlayerParts / 3 * Number(videoFeeRate)));
  const totalFee = Number((Number(fieldFee) + Number(lateFee) + Number(videoFee)).toFixed(2));
  
  return {
    normalPlayerParts,
    fieldFee,
    lateFee,
    videoFee,
    totalFee
  };
}

async function importMatch(filePath: string, creatorId: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data: MatchFile = JSON.parse(content);

  // Normalize to an array of sheets
  let sheets: Sheet[] = [];
  if (data.sheets) {
    sheets = data.sheets;
  } else if (data.meta && data.players) {
    sheets = [{ meta: data.meta, players: data.players }];
  } else {
    console.error(`Invalid JSON structure in ${filePath}: Missing 'sheets' or 'meta/players' roots.`);
    return;
  }

  for (const sheet of sheets) {
    const { sheetName, matchScore, fees } = sheet.meta;
    const { matchDate, opponent } = parseMeta(sheetName);
    const { ourScore, opponentScore } = parseScore(matchScore);

    console.log(`Importing match: ${sheetName} (Date: ${matchDate.toISOString().split('T')[0]}, Opponent: ${opponent})`);

    const coefficient = calculateCoefficient(fees.pitchFee || 0, fees.waterFee || 0);

    // 1. Create Match
    const match = await prisma.match.create({
      data: {
        matchDate,
        opponentTeam: opponent,
        ourScore,
        opponentScore,
        fieldFeeTotal: fees.pitchFee || 0,
        waterFeeTotal: fees.waterFee || 0,
        createdBy: creatorId,
        matchResult: 
          ourScore > opponentScore ? 'WIN' : 
          ourScore < opponentScore ? 'LOSE' : 'DRAW',
      },
    });

    const matchPlayersToCreate = [];
    const processedUserIds = new Set<string>();

    // 2. Process Players
    for (const pData of sheet.players) {
      if (!pData.shortId) continue;

      const user = await prisma.user.findUnique({
        where: { shortId: pData.shortId },
      });

      if (!user) {
        console.warn(`Player not found for shortId: ${pData.shortId} (${pData.name}) - Skipping`);
        continue;
      }

      if (processedUserIds.has(user.id)) {
        console.warn(`Duplicate player detected in match ${sheetName}: ${pData.name} (shortId: ${pData.shortId}). Skipping to avoid DB error.`);
        continue;
      }
      processedUserIds.add(user.id);

      // Prepare for MatchPlayer creation
      matchPlayersToCreate.push({
        matchId: match.id,
        playerId: user.id,
      });

      // Construct AttendanceData
      const attendanceData = {
        attendance: {
          "1": {}, "2": {}, "3": {}
        },
        goalkeeper: {
          "1": {}, "2": {}, "3": {}
        }
      };

      const segments = [pData.segments.q1, pData.segments.q2, pData.segments.q3];
      
      segments.forEach((q, qIndex) => {
        const sectionStr = (qIndex + 1).toString();
        q.forEach((val, pIndex) => {
          const partStr = (pIndex + 1).toString();
          
          let attVal = 0;
          let isGk = false;

          if (val === '守门') {
            attVal = 1;
            isGk = true;
          } else if (typeof val === 'number') {
            attVal = val;
          } else if (typeof val === 'string') {
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) attVal = parsed;
          }

          attendanceData.attendance[sectionStr][partStr] = attVal;
          attendanceData.goalkeeper[sectionStr][partStr] = isGk;
        });
      });

      const isLate = !!(pData.late?.status || pData.late?.fine > 0);
      const feeCalc = calculatePlayerFees(
        attendanceData, 
        isLate, 
        coefficient, 
        10, // Default late fee rate
        2   // Default video fee rate
      );

      // Create Participation
      await prisma.matchParticipation.create({
        data: {
          matchId: match.id,
          userId: user.id,
          attendanceData: attendanceData as any,
          isLateArrival: isLate,
          totalTime: feeCalc.normalPlayerParts,
          fieldFeeCalculated: feeCalc.fieldFee,
          lateFee: feeCalc.lateFee,
          videoFee: feeCalc.videoFee,
          totalFeeCalculated: feeCalc.totalFee,
        },
      });

      // Create Fee Override if remarks/notes exist
      if (pData.remarks && pData.remarks.trim()) {
        await prisma.feeOverride.create({
          data: {
            matchId: match.id,
            playerId: user.id,
            // If import has specific fine/fee logic override it here?
            // User schema shows 'fine' in 'late' object. 
            // If the fine is different from calculated late fee, maybe override?
            // For now just storing remarks in notes.
            notes: pData.remarks.trim(),
          }
        });
      }

      // Create Events (Goals)
      if (pData.stats.goals > 0) {
        for (let i = 0; i < pData.stats.goals; i++) {
          await prisma.matchEvent.create({
            data: {
              matchId: match.id,
              playerId: user.id,
              eventType: 'GOAL',
              createdBy: creatorId,
            },
          });
        }
      }

      // Create Events (Assists)
      if (pData.stats.assists > 0) {
        for (let i = 0; i < pData.stats.assists; i++) {
          await prisma.matchEvent.create({
            data: {
              matchId: match.id,
              playerId: user.id,
              eventType: 'ASSIST',
              createdBy: creatorId,
            },
          });
        }
      }
    }

    // Bulk create MatchPlayers
    if (matchPlayersToCreate.length > 0) {
      await prisma.matchPlayer.createMany({
        data: matchPlayersToCreate,
      });
    }

    console.log(`Processed ${sheet.players.length} players for match ${match.id}`);
  }
}

async function main() {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.error('Please provide a file path or directory as argument.');
    process.exit(1);
  }

  const creator = await getAdminUser();
  console.log(`Using user ${creator.name} (${creator.id}) as creator.`);

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(targetPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      await importMatch(path.join(targetPath, file), creator.id);
    }
  } else {
    await importMatch(targetPath, creator.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
