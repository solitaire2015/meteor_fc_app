import { z } from "zod";
import { tool } from "langchain";
import {
  matchInfoPatchSchema,
  playerSelectionPatchSchema,
  attendancePatchSchema,
  eventsPatchSchema,
  feeOverridePatchSchema,
  patchEnvelopeSchema,
  type PatchEnvelope,
} from "./schema";

const baseArgsSchema = z.object({
  summary: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

const buildPatch = (patch: PatchEnvelope) => {
  return patchEnvelopeSchema.parse(patch);
};

export const proposeMatchCreatePatch = tool(
  async (args) =>
    buildPatch({
      target: "match_create",
      summary: args.summary,
      changes: [{ type: "match_info", data: args.data }],
      confidence: args.confidence,
    }),
  {
    name: "propose_match_create_patch",
    description: "为比赛创建页面生成表单补丁。",
    schema: baseArgsSchema.extend({
      data: matchInfoPatchSchema,
    }),
  }
);

export const proposeMatchInfoPatch = tool(
  async (args) =>
    buildPatch({
      target: "match_detail",
      summary: args.summary,
      changes: [{ type: "match_info", data: args.data }],
      confidence: args.confidence,
    }),
  {
    name: "propose_match_info_patch",
    description: "为比赛详情的基本信息生成补丁。",
    schema: baseArgsSchema.extend({
      data: matchInfoPatchSchema,
    }),
  }
);

export const proposePlayerSelectionPatch = tool(
  async (args) =>
    buildPatch({
      target: "match_detail",
      summary: args.summary,
      changes: [{ type: "player_selection", data: args.data }],
      confidence: args.confidence,
    }),
  {
    name: "propose_player_selection_patch",
    description: "为比赛详情的球员选择生成补丁。",
    schema: baseArgsSchema.extend({
      data: playerSelectionPatchSchema,
    }),
  }
);

export const proposeAttendancePatch = tool(
  async (args) =>
    buildPatch({
      target: "match_detail",
      summary: args.summary,
      changes: [{ type: "attendance", data: args.data }],
      confidence: args.confidence,
    }),
  {
    name: "propose_attendance_patch",
    description: "为出勤、上场、门将、迟到生成补丁。",
    schema: baseArgsSchema.extend({
      data: attendancePatchSchema,
    }),
  }
);

export const proposeEventsPatch = tool(
  async (args) =>
    buildPatch({
      target: "match_detail",
      summary: args.summary,
      changes: [{ type: "events", data: args.data }],
      confidence: args.confidence,
    }),
  {
    name: "propose_events_patch",
    description: "为比赛事件（进球、助攻、红黄牌、点球等）生成补丁。",
    schema: baseArgsSchema.extend({
      data: eventsPatchSchema,
    }),
  }
);

export const proposeFeesPatch = tool(
  async (args) =>
    buildPatch({
      target: "match_detail",
      summary: args.summary,
      changes: [{ type: "fees", data: args.data }],
      confidence: args.confidence,
    }),
  {
    name: "propose_fee_override_patch",
    description: "为费用调整生成补丁。",
    schema: baseArgsSchema.extend({
      data: feeOverridePatchSchema,
    }),
  }
);

const userProfileSchema = z.object({
  name: z.string().optional(),
  shortId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  userType: z.enum(["ADMIN", "PLAYER"]).optional(),
  accountStatus: z.enum(["GHOST", "CLAIMED"]).optional(),
  jerseyNumber: z.number().optional(),
  position: z.string().optional(),
  dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  introduction: z.string().optional(),
  joinDate: z.string().optional(),
});

export const proposeCreateUserAction = tool(
  async (args) =>
    buildPatch({
      target: "user_admin",
      summary: args.summary,
      changes: [
        {
          type: "user_action",
          data: {
            action: "create_user",
            data: args.data,
          },
        },
      ],
      confidence: args.confidence,
    }),
  {
    name: "propose_create_user_action",
    description: "提出创建用户的操作提案。",
    schema: baseArgsSchema.extend({
      data: userProfileSchema,
    }),
  }
);

export const proposeUpdateUserAction = tool(
  async (args) =>
    buildPatch({
      target: "user_admin",
      summary: args.summary,
      changes: [
        {
          type: "user_action",
          data: {
            action: "update_user",
            userId: args.userId,
            data: args.data,
          },
        },
      ],
      confidence: args.confidence,
    }),
  {
    name: "propose_update_user_action",
    description: "提出更新用户信息的操作提案。",
    schema: baseArgsSchema.extend({
      userId: z.string(),
      data: userProfileSchema,
    }),
  }
);

export const proposeDeleteUserAction = tool(
  async (args) =>
    buildPatch({
      target: "user_admin",
      summary: args.summary,
      changes: [
        {
          type: "user_action",
          data: {
            action: "delete_user",
            userId: args.userId,
            data: args.deletionReason ? { deletionReason: args.deletionReason } : undefined,
          },
        },
      ],
      confidence: args.confidence,
    }),
  {
    name: "propose_delete_user_action",
    description: "提出删除用户的操作提案。",
    schema: baseArgsSchema.extend({
      userId: z.string(),
      deletionReason: z.string().optional(),
    }),
  }
);

export const proposeRestoreUserAction = tool(
  async (args) =>
    buildPatch({
      target: "user_admin",
      summary: args.summary,
      changes: [
        {
          type: "user_action",
          data: {
            action: "restore_user",
            userId: args.userId,
          },
        },
      ],
      confidence: args.confidence,
    }),
  {
    name: "propose_restore_user_action",
    description: "提出恢复用户的操作提案。",
    schema: baseArgsSchema.extend({
      userId: z.string(),
    }),
  }
);

export const proposeSetPasswordAction = tool(
  async (args) =>
    buildPatch({
      target: "user_admin",
      summary: args.summary,
      changes: [
        {
          type: "user_action",
          data: {
            action: "set_password",
            userId: args.userId,
            data: { password: args.password },
          },
        },
      ],
      confidence: args.confidence,
    }),
  {
    name: "propose_set_password_action",
    description: "提出为用户设置密码的操作提案。",
    schema: baseArgsSchema.extend({
      userId: z.string(),
      password: z.string().min(8),
    }),
  }
);

const fetchJson = async (url: URL, headers?: HeadersInit) => {
  const response = await fetch(url, { cache: "no-store", headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Unexpected response from API.");
  }

  return response.json();
};

export const createReadOnlyTools = (baseUrl: string, headers?: HeadersInit) => {
  const base = baseUrl || "http://localhost:3000";

  const leaderboardTool = tool(
    async (args) => {
      const url = new URL("/api/leaderboard", base);
      if (args.type) url.searchParams.set("type", args.type);
      if (args.year) url.searchParams.set("year", String(args.year));
      if (args.month) url.searchParams.set("month", String(args.month));
      if (args.limit) url.searchParams.set("limit", String(args.limit));
      const data = await fetchJson(url, headers);
      return data;
    },
    {
      name: "get_leaderboard",
      description: "获取排行榜数据（进球/助攻/红黄牌/点球/乌龙/扑救）。",
      schema: z.object({
        type: z.enum(["goals", "assists", "yellow_cards", "red_cards", "penalty_goals", "penalty_misses", "own_goals", "saves"]).optional(),
        year: z.number().optional(),
        month: z.number().optional(),
        limit: z.number().optional(),
      }),
    }
  );

  const statsTool = tool(
    async (args) => {
      const url = new URL("/api/stats", base);
      if (args.type) url.searchParams.set("type", args.type);
      if (args.year) url.searchParams.set("year", String(args.year));
      if (args.month) url.searchParams.set("month", String(args.month));
      const data = await fetchJson(url, headers);
      return data;
    },
    {
      name: "get_stats",
      description: "获取统计数据（团队/球员）。",
      schema: z.object({
        type: z.enum(["team", "player"]).optional(),
        year: z.number().optional(),
        month: z.number().optional(),
      }),
    }
  );

  const statisticsTool = tool(
    async () => {
      const url = new URL("/api/statistics", base);
      const data = await fetchJson(url, headers);
      return data;
    },
    {
      name: "get_statistics",
      description: "获取综合统计数据。",
      schema: z.object({}),
    }
  );

  const playersTool = tool(
    async () => {
      const url = new URL("/api/players", base);
      const data = await fetchJson(url, headers);
      return data;
    },
    {
      name: "get_players_info",
      description: "获取球员/用户信息列表。",
      schema: z.object({}),
    }
  );

  const gamesTool = tool(
    async () => {
      const url = new URL("/api/games", base);
      const data = await fetchJson(url, headers);
      return data;
    },
    {
      name: "get_games_list",
      description: "获取比赛列表。",
      schema: z.object({}),
    }
  );

  return [leaderboardTool, statsTool, statisticsTool, playersTool, gamesTool];
};
