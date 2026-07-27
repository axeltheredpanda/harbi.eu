"use client";

import { useTransition } from "react";
import { toggleTodo, deleteTodo } from "@/backend/todos";
import type { Database } from "@/backend/supabase/types";

type Todo = Database["public"]["Tables"]["todos"]["Row"];

export function TodoItem({ todo }: { todo: Todo }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <input
        type="checkbox"
        checked={todo.done}
        disabled={isPending}
        onChange={(e) => startTransition(() => toggleTodo(todo.id, e.target.checked))}
        className="accent-accent"
      />
      <span
        className={`flex-1 text-sm ${todo.done ? "text-ink-faint line-through" : "text-ink"}`}
      >
        {todo.title}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteTodo(todo.id))}
        className="font-mono text-xs text-ink-faint hover:text-ink"
      >
        Delete
      </button>
    </li>
  );
}
