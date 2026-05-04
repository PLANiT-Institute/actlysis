"use client";

import { useState } from "react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { DEFAULT_SECTION_PROMPTS } from "@/lib/constants";
import type { SectionConfig } from "@/lib/types";

interface SectionItemProps {
  section: SectionConfig;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  onUpdate: (updates: Partial<SectionConfig>) => void;
  onRemove: () => void;
  isCustom: boolean;
}

export function SectionItem({
  section,
  dragHandleProps,
  onUpdate,
  onRemove,
  isCustom,
}: SectionItemProps) {
  const [expanded, setExpanded] = useState(false);
  const placeholderPrompt = DEFAULT_SECTION_PROMPTS[section.id] ?? "이 섹션에 포함할 내용을 설명하세요.";

  return (
    <div
      className={`rounded-lg border bg-white transition-all ${
        section.enabled ? "border-slate-200" : "border-slate-100 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <Switch
          id={`switch-${section.id}`}
          checked={section.enabled}
          onCheckedChange={(checked) => onUpdate({ enabled: checked })}
        />

        {isCustom ? (
          <Input
            value={section.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-7 text-sm font-medium border-0 px-0 focus-visible:ring-0 bg-transparent"
            placeholder="섹션 제목"
          />
        ) : (
          <Label
            htmlFor={`switch-${section.id}`}
            className="flex-1 text-sm font-medium cursor-pointer"
          >
            {section.label}
          </Label>
        )}

        <div className="flex items-center gap-1">
          {isCustom && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-1.5 mt-2">커스텀 프롬프트 (비워두면 기본 프롬프트 사용)</p>
          <Textarea
            value={section.customPrompt ?? ""}
            onChange={(e) => onUpdate({ customPrompt: e.target.value })}
            placeholder={placeholderPrompt}
            className="text-sm min-h-[80px] resize-y"
          />
        </div>
      )}
    </div>
  );
}
