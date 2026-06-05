"use server";

import { z } from "zod";
import { requirePlatformAdmin, requireProfile } from "@/lib/auth";
import { revalidateAndReturn } from "@/lib/actions/refresh";
import { platformModules } from "@/lib/platform";
import { createAdminClient, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/server";

const postgresUuid = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

const entitlementSchema = z.object({
  store_id: postgresUuid,
  module_key: z.enum(platformModules.map((module) => module.key) as [string, ...string[]]),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  note: z.string().trim().optional(),
});

const storeStatusSchema = z.object({
  store_id: postgresUuid,
  status: z.enum(["active", "inactive", "disabled"]),
});

export async function updateStoreModuleEntitlementAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = entitlementSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    await revalidateAndReturn(["/platform"], "/platform");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("store_module_entitlements").upsert(
    {
      store_id: payload.store_id,
      module_key: payload.module_key,
      enabled: payload.enabled,
      note: payload.note || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,module_key" },
  );

  if (error) throw new Error(error.message);
  await revalidateAndReturn(["/platform"], "/platform");
}

export async function updatePlatformStoreStatusAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = storeStatusSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    await revalidateAndReturn(["/platform"], "/platform");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("stores")
    .update({ status: payload.status })
    .eq("id", payload.store_id);

  if (error) throw new Error(error.message);
  await revalidateAndReturn(["/platform"], "/platform");
}
