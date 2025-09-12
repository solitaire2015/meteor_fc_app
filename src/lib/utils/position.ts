import { Position } from "@prisma/client";

export type PositionGroup = {
  name: string;
  color: string;
  positions: Position[];
};

export const positionGroups: Record<string, PositionGroup> = {
  goalkeeper: {
    name: "门将",
    color: "text-yellow-600 bg-yellow-50",
    positions: [Position.GK]
  },
  defenders: {
    name: "后卫", 
    color: "text-blue-600 bg-blue-50",
    positions: [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB]
  },
  midfielders: {
    name: "中场",
    color: "text-green-600 bg-green-50", 
    positions: [Position.DMF, Position.CMF, Position.AMF, Position.LMF, Position.RMF]
  },
  forwards: {
    name: "前锋",
    color: "text-red-600 bg-red-50",
    positions: [Position.CF, Position.ST, Position.SS, Position.LWF, Position.RWF]
  }
};

export const positionLabels: Record<Position, string> = {
  // Goalkeeper
  [Position.GK]: "门将",
  
  // Defenders
  [Position.CB]: "中后卫",
  [Position.LB]: "左后卫", 
  [Position.RB]: "右后卫",
  [Position.LWB]: "左翼卫",
  [Position.RWB]: "右翼卫",
  
  // Midfielders
  [Position.DMF]: "后腰",
  [Position.CMF]: "中场",
  [Position.AMF]: "前腰", 
  [Position.LMF]: "左前卫",
  [Position.RMF]: "右前卫",
  
  // Forwards
  [Position.CF]: "中锋",
  [Position.ST]: "前锋",
  [Position.SS]: "影锋",
  [Position.LWF]: "左边锋",
  [Position.RWF]: "右边锋"
};

export function getPositionGroup(position: Position): PositionGroup | null {
  for (const group of Object.values(positionGroups)) {
    if (group.positions.includes(position)) {
      return group;
    }
  }
  return null;
}

export function getPositionColor(position: Position): string {
  const group = getPositionGroup(position);
  return group?.color.split(' ')[0] || "text-gray-600";
}

export function getPositionLabel(position: Position): string {
  return positionLabels[position] || position;
}