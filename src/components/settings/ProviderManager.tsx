"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import type { ProviderConfig, ProviderType } from "@/lib/types";
import {
  loadCustomProviders,
  addCustomProvider,
  removeCustomProvider,
  updateCustomProvider,
} from "@/lib/provider-storage";

interface FormState {
  id: string;
  name: string;
  type: "openai-compatible" | "anthropic";
  baseUrl: string;
  apiKey: string;
  modelsRaw: string; // comma-separated
}

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  type: "openai-compatible",
  baseUrl: "",
  apiKey: "",
  modelsRaw: "",
};

function typeBadgeVariant(type: ProviderType): "default" | "secondary" | "outline" {
  switch (type) {
    case "openai-compatible":
      return "default";
    case "anthropic":
      return "secondary";
    default:
      return "outline";
  }
}

function typeLabel(type: ProviderType): string {
  switch (type) {
    case "openai-compatible":
      return "OpenAI 호환";
    case "anthropic":
      return "Anthropic API";
    case "ollama":
      return "Ollama";
    case "claude-code":
      return "Claude Code";
  }
}

function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formToConfig(form: FormState): ProviderConfig {
  const models = form.modelsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: form.id || generateId(),
    name: form.name.trim(),
    type: form.type,
    baseUrl: form.type === "openai-compatible" ? form.baseUrl.trim() || undefined : undefined,
    apiKey: form.apiKey.trim() || undefined,
    models,
  };
}

function configToForm(config: ProviderConfig): FormState {
  return {
    id: config.id,
    name: config.name,
    type: (config.type === "openai-compatible" || config.type === "anthropic")
      ? config.type
      : "openai-compatible",
    baseUrl: config.baseUrl ?? "",
    apiKey: config.apiKey ?? "",
    modelsRaw: config.models.join(", "),
  };
}

export function ProviderManager() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    setProviders(loadCustomProviders());
  }, []);

  function openAddForm() {
    setForm({ ...EMPTY_FORM, id: generateId() });
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(config: ProviderConfig) {
    setForm(configToForm(config));
    setEditingId(config.id);
    setFormError("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormError("이름을 입력하세요.");
      return;
    }
    if (form.type === "openai-compatible" && !form.baseUrl.trim()) {
      setFormError("Base URL을 입력하세요.");
      return;
    }
    if (!form.modelsRaw.trim()) {
      setFormError("모델 ID를 하나 이상 입력하세요.");
      return;
    }

    const config = formToConfig(form);

    if (editingId !== null) {
      updateCustomProvider(config);
    } else {
      addCustomProvider(config);
    }

    setProviders(loadCustomProviders());
    cancelForm();
  }

  function handleDelete(id: string) {
    removeCustomProvider(id);
    setProviders(loadCustomProviders());
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError("");
  }

  return (
    <div className="space-y-4">
      {/* Provider list */}
      {providers.length === 0 && !showForm && (
        <p className="text-sm text-slate-400">
          사용자 정의 AI 프로바이더가 없습니다. 아래 버튼을 눌러 추가하세요.
        </p>
      )}

      <ul className="space-y-2">
        {providers.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-medium text-slate-800 truncate">{p.name}</span>
              <Badge variant={typeBadgeVariant(p.type)}>{typeLabel(p.type)}</Badge>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {p.models.length}개 모델
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openEditForm(p)}
                aria-label="편집"
              >
                <Pencil />
              </Button>
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={() => handleDelete(p.id)}
                aria-label="삭제"
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Inline form */}
      {showForm ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <p className="font-medium text-slate-800 text-sm">
            {editingId !== null ? "프로바이더 편집" : "새 프로바이더 추가"}
          </p>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="pm-name">
              이름
            </label>
            <Input
              id="pm-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="예: Groq (Llama 3)"
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="pm-type">
              유형
            </label>
            <select
              id="pm-type"
              value={form.type}
              onChange={(e) =>
                updateField("type", e.target.value as "openai-compatible" | "anthropic")
              }
              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="openai-compatible">OpenAI 호환</option>
              <option value="anthropic">Anthropic API</option>
            </select>
          </div>

          {/* Base URL (only for openai-compatible) */}
          {form.type === "openai-compatible" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="pm-base-url">
                Base URL
              </label>
              <Input
                id="pm-base-url"
                value={form.baseUrl}
                onChange={(e) => updateField("baseUrl", e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="pm-api-key">
              API 키
            </label>
            <Input
              id="pm-api-key"
              type="password"
              value={form.apiKey}
              onChange={(e) => updateField("apiKey", e.target.value)}
              placeholder="sk-..."
            />
          </div>

          {/* Models */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="pm-models">
              모델 (쉼표로 구분)
            </label>
            <Input
              id="pm-models"
              value={form.modelsRaw}
              onChange={(e) => updateField("modelsRaw", e.target.value)}
              placeholder="gpt-4o, gpt-4o-mini"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600">{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3.5 w-3.5" />
              저장
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>
              <X className="h-3.5 w-3.5" />
              취소
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={openAddForm}>
          <Plus className="h-3.5 w-3.5" />
          추가
        </Button>
      )}
    </div>
  );
}
