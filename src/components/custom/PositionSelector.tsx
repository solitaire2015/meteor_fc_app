"use client";

import { Position } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { positionGroups, positionLabels, getPositionColor } from "@/lib/utils/position";

interface PositionSelectorProps {
  value?: Position | string;
  onValueChange: (value: Position) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PositionSelector({ 
  value, 
  onValueChange, 
  label = "位置",
  placeholder = "选择位置",
  disabled = false 
}: PositionSelectorProps) {
  
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select 
        value={value || ""} 
        onValueChange={(newValue) => onValueChange(newValue as Position)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(positionGroups).map(([groupKey, group]) => (
            <div key={groupKey}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${group.color.split(' ')[1]}`}></span>
                {group.name}
              </div>
              {group.positions.map((position) => (
                <SelectItem 
                  key={position} 
                  value={position}
                  className="pl-6"
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getPositionColor(position)}`}>
                      {position}
                    </span>
                    <span className="text-muted-foreground">
                      {positionLabels[position]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}