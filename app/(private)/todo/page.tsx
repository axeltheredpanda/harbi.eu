import { getTodos, addTodo } from "@/backend/todos";
import { buttonClass } from "@/frontend/components/button-variants";
import { TodoItem } from "./todo-item";

export default async function TodoPage() {
  const todos = await getTodos();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm text-accent">{"// todo"}</p>
        <h1 className="font-display text-2xl font-medium text-ink">Todo</h1>
      </div>

      <form action={addTodo} className="flex gap-2">
        <input
          type="text"
          name="title"
          required
          placeholder="New todo"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <button type="submit" className={buttonClass("primary")}>
          Add
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
        {todos.length === 0 && (
          <p className="font-mono text-sm text-ink-faint">No todos yet.</p>
        )}
      </ul>
    </div>
  );
}
