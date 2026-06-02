"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const storeSchema = z.object({
  name: z.string().trim().min(1),
  business_mode: z.string().trim().min(1),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(1),
});

export async function updateStoreSettingsAction(formData: FormData) {
  const profile = await requireProfile();
  requireOwner(profile);
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
