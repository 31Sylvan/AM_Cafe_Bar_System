"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const storeSchema = z.object({
  name: z.string().trim().min(1),
  business_mode: z.string().trim().min(1),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(1),
});

export async function updateStoreSettingsAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const payload = storeSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/settings");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: payload.name,
      business_mode: payload.business_mode,
      address: payload.address || null,
      timezone: payload.timezone,
    })
    .eq("id", profile.store_id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function switchCurrentStoreAction(formData: FormData) {
  await requireProfile();
  const storeId = z.string().uuid().parse(formData.get("store_id"));

  if (!hasSupabaseEnv()) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("switch_current_store", {
    p_store_id: storeId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function createStoreAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const payload = storeSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/settings");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_store_for_current_tenant", {
    p_name: payload.name,
    p_business_mode: payload.business_mode,
    p_address: payload.address || null,
    p_timezone: payload.timezone,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
