import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoStore } from "@/lib/demo-auth";
import type { Store } from "@/lib/types";

export async function getCurrentStore() {
  if (!hasSupabaseEnv()) return demoStore;

  const supabase = await createClient();
  const { data, error } = await supabase.from("stores").select("*").single();

  if (error) throw new Error(error.message);
  return data as Store;
}
