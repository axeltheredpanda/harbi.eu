"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";

export async function getTodos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function addTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("todos").insert({ title, user_id: user.id });
  if (error) throw error;

  revalidatePath("/todo");
}

export async function toggleTodo(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("todos").update({ done }).eq("id", id);
  if (error) throw error;

  revalidatePath("/todo");
}

export async function deleteTodo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/todo");
}
