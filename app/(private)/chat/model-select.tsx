"use client";

import { CHAT_MODELS, type ChatModelId } from "@/backend/chat/constants";

type Props = {
  value: ChatModelId;
  disabled?: boolean;
  onChange: (model: ChatModelId) => void;
};

export function ModelSelect({ value, disabled, onChange }: Props) {
  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="sr-only">Claude model</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as ChatModelId)}
        className="max-w-[10.5rem] cursor-pointer truncate rounded-sm border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-ink transition-colors duration-150 hover:border-accent/40 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-none"
      >
        {CHAT_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label} · {model.hint}
          </option>
        ))}
      </select>
    </label>
  );
}
