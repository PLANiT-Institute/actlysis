"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { SectionItem } from "./SectionItem";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DEFAULT_SECTIONS } from "@/lib/constants";
import type { SectionConfig } from "@/lib/types";

interface SectionConfigPanelProps {
  onGenerate: (sections: SectionConfig[]) => void;
  isGenerating: boolean;
}

export function SectionConfigPanel({ onGenerate, isGenerating }: SectionConfigPanelProps) {
  const [sections, setSections] = useState<SectionConfig[]>(() =>
    DEFAULT_SECTIONS.map((s) => ({ ...s }))
  );

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const items = Array.from(sections);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setSections(items.map((s, i) => ({ ...s, order: i })));
  }

  function updateSection(id: string, updates: Partial<SectionConfig>) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function addSection() {
    const newId = `custom-${Date.now()}`;
    setSections((prev) => [
      ...prev,
      {
        id: newId,
        label: "새 섹션",
        enabled: true,
        order: prev.length,
        customPrompt: "",
      },
    ]);
  }

  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">분석 섹션 구성</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            섹션을 드래그해서 순서를 변경하거나, 토글로 켜고 끄세요.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addSection}>
          <Plus className="h-4 w-4 mr-1" />
          섹션 추가
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {sections.map((section, index) => (
                <Draggable key={section.id} draggableId={section.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? "opacity-80" : ""}
                    >
                      <SectionItem
                        section={section}
                        dragHandleProps={provided.dragHandleProps}
                        onUpdate={(updates) => updateSection(section.id, updates)}
                        onRemove={() => removeSection(section.id)}
                        isCustom={!["overview", "articles", "precedents", "terms"].includes(section.id)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="pt-2">
        <Button
          className="w-full"
          size="lg"
          onClick={() => onGenerate(sections)}
          disabled={isGenerating || enabledCount === 0}
        >
          {isGenerating
            ? "분석 생성 중..."
            : `AI 분석 생성 (${enabledCount}개 섹션)`}
        </Button>
        {enabledCount === 0 && (
          <p className="text-xs text-center text-slate-400 mt-2">
            최소 1개의 섹션을 활성화하세요.
          </p>
        )}
      </div>
    </div>
  );
}
