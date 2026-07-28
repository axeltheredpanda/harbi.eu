"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import type { Database } from "@/backend/supabase/types";

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export type VehicleInput = {
  title: string;
  price: number | null;
  mileage: number | null;
  year: number | null;
  url: string | null;
  note: string | null;
};

export async function listVehicles(): Promise<Vehicle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      price: input.price,
      mileage: input.mileage,
      year: input.year,
      url: input.url?.trim() || null,
      note: input.note?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  revalidatePath("/garage");
  return data;
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({
      title: input.title.trim(),
      price: input.price,
      mileage: input.mileage,
      year: input.year,
      url: input.url?.trim() || null,
      note: input.note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/garage");
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/garage");
}
