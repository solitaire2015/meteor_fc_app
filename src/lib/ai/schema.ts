import { z } from "zod";

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

const matchListItemSchema = z.object({
  id: z.string(),
  matchDate: z.string(),
  matchTime: z.string().nullable().optional(),
  opponentTeam: z.string(),
  ourScore: z.number().nullable().optional(),
  opponentScore: z.number().nullable().optional(),
  status: z.string().optional(),
});

const matchFeeBreakdownSchema = z.object({
  player: z.object({
    id: z.string(),
    name: z.string(),
    jerseyNumber: z.number().nullable().optional(),
    position: z.string().nullable().optional(),
  }),
  totalTime: z.number(),
  isLateArrival: z.boolean(),
  calculatedFees: z.object({
    fieldFee: z.number(),
    videoFee: z.number(),
    lateFee: z.number(),
    totalFee: z.number(),
  }),
  finalFees: z.object({
    fieldFee: z.number(),
    videoFee: z.number(),
    lateFee: z.number(),
    totalFee: z.number(),
  }),
  override: z
    .object({
      fieldFeeOverride: z.number().nullable().optional(),
      videoFeeOverride: z.number().nullable().optional(),
      lateFeeOverride: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const matchFeeSummarySchema = z.object({
  totalParticipants: z.number(),
  totalCalculatedFees: z.number(),
  totalFinalFees: z.number(),
  feeDifference: z.number(),
  overrideCount: z.number(),
  overridePercentage: z.number(),
  feeCoefficient: z.number(),
});

const currentMatchSchema = z.object({
  info: z.object({
    id: z.string(),
    matchDate: z.string(),
    matchTime: z.string().nullable().optional(),
    opponentTeam: z.string(),
    ourScore: z.number().nullable().optional(),
    opponentScore: z.number().nullable().optional(),
    fieldFeeTotal: z.number().optional(),
    waterFeeTotal: z.number().optional(),
    notes: z.string().nullable().optional(),
    status: z.string().optional(),
  }),
  selectedPlayers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      jerseyNumber: z.number().nullable().optional(),
      position: z.string().nullable().optional(),
    })
  ),
  attendance: z.array(
    z.object({
      userId: z.string(),
      section: z.number().int().min(1).max(3),
      part: z.number().int().min(1).max(3),
      value: z.number().min(0).max(1),
      isGoalkeeper: z.boolean(),
      isLateArrival: z.boolean(),
      goals: z.number().min(0),
      assists: z.number().min(0),
      notes: z.string().nullable().optional(),
    })
  ),
  fees: z
    .object({
      match: z
        .object({
          id: z.string(),
          opponentTeam: z.string(),
          fieldFeeTotal: z.number(),
          waterFeeTotal: z.number(),
        })
        .optional(),
      feeBreakdown: z.array(matchFeeBreakdownSchema).optional(),
      summary: matchFeeSummarySchema.optional(),
    })
    .optional(),
});

export const assistantContextSchema = z.object({
  page: z.string(),
  currentUser: z
    .object({
      id: z.string(),
      name: z.string(),
      userType: z.string(),
      accountStatus: z.string(),
      email: z.string().optional(),
    })
    .optional(),
  matchId: z.string().nullable().optional(),
  matchList: z.array(matchListItemSchema).optional(),
  currentMatch: currentMatchSchema.optional(),
  origin: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  now: z.string().optional(),
  availablePlayers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        jerseyNumber: z.number().nullable().optional(),
        position: z.string().nullable().optional(),
      })
    )
    .optional(),
  availableUsers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        jerseyNumber: z.number().nullable().optional(),
        position: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        userType: z.enum(["ADMIN", "PLAYER"]).optional(),
        accountStatus: z.enum(["GHOST", "CLAIMED"]).optional(),
        playerStatus: z.enum(["REGULAR", "TRIAL", "VACATION"]).optional(),
      })
    )
    .optional(),
  formState: z.unknown().optional(),
});

export type AssistantContext = z.infer<typeof assistantContextSchema>;

export const assistantRequestSchema = z.object({
  context: assistantContextSchema,
  messages: z.array(assistantMessageSchema).min(1),
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

export const matchInfoPatchSchema = z.object({
  opponentTeam: z.string().optional(),
  matchDate: z.string().optional(),
  matchTime: z.string().optional(),
  ourScore: z.number().nullable().optional(),
  opponentScore: z.number().nullable().optional(),
  fieldFeeTotal: z.number().optional(),
  waterFeeTotal: z.number().optional(),
  notes: z.string().nullable().optional(),
});

export const playerSelectionPatchSchema = z.object({
  addPlayerIds: z.array(z.string()).default([]),
  removePlayerIds: z.array(z.string()).default([]),
});

export const attendanceUpdateSchema = z.object({
  playerId: z.string(),
  section: z.number().int().min(1).max(3).optional(),
  part: z.number().int().min(1).max(3).optional(),
  value: z.number().min(0).max(1).optional(),
  isGoalkeeper: z.boolean().optional(),
  isLateArrival: z.boolean().optional(),
});

export const attendancePatchSchema = z.object({
  updates: z.array(attendanceUpdateSchema).min(1),
});

export const eventsPatchSchema = z.object({
  updates: z
    .array(
      z.object({
        playerId: z.string(),
        eventType: z.enum([
          "GOAL",
          "ASSIST",
          "YELLOW_CARD",
          "RED_CARD",
          "PENALTY_GOAL",
          "PENALTY_MISS",
          "OWN_GOAL",
          "SAVE",
        ]),
        minute: z.number().int().min(0).max(120).optional(),
      })
    )
    .min(1),
});

export const feeOverridePatchSchema = z.object({
  overrides: z
    .array(
      z.object({
        playerId: z.string(),
        fieldFee: z.number().min(0).optional(),
        videoFee: z.number().min(0).optional(),
        lateFee: z.number().min(0).optional(),
        paymentNote: z.string().optional(),
      })
    )
    .min(1),
});

export const userActionSchema = z.object({
  action: z.enum([
    "create_user",
    "update_user",
    "delete_user",
    "restore_user",
    "set_password",
  ]),
  userId: z.string().optional(),
  data: z
    .object({
      name: z.string().optional(),
      shortId: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      userType: z.enum(["ADMIN", "PLAYER"]).optional(),
      accountStatus: z.enum(["GHOST", "CLAIMED"]).optional(),
      playerStatus: z.enum(["REGULAR", "TRIAL", "VACATION"]).optional(),
      jerseyNumber: z.number().optional(),
      position: z.string().optional(),
      dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
      introduction: z.string().optional(),
      joinDate: z.string().optional(),
      deletionReason: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
});

export const changeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("match_info"), data: matchInfoPatchSchema }),
  z.object({
    type: z.literal("player_selection"),
    data: playerSelectionPatchSchema,
  }),
  z.object({ type: z.literal("attendance"), data: attendancePatchSchema }),
  z.object({ type: z.literal("events"), data: eventsPatchSchema }),
  z.object({ type: z.literal("fees"), data: feeOverridePatchSchema }),
  z.object({ type: z.literal("user_action"), data: userActionSchema }),
]);

export type AssistantChange = z.infer<typeof changeSchema>;

export const patchEnvelopeSchema = z.object({
  target: z.enum(["match_create", "match_detail", "user_admin"]),
  summary: z.string(),
  changes: z.array(changeSchema).min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export type PatchEnvelope = z.infer<typeof patchEnvelopeSchema>;

export type AgentType =
  | "match"
  | "user_admin"
  | "general";

export const agentTypeSchema = z.enum([
  "match",
  "user_admin",
  "general",
]);
