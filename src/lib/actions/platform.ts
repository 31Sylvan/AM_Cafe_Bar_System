"use server";

import { z } from "zod";
import { requirePlatformAdmin, requireProfile } from "@/lib/auth";
import { revalidatePaths } from "@/lib/actions/refresh";
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

const platformScopeSwitchSchema = z.object({
  store_id: postgresUuid,
});

export async function updateStoreModuleEntitlementAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = entitlementSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return await revalidatePaths(["/platform"]);
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
  return await revalidatePaths(["/platform"]);
}

export async function updatePlatformStoreStatusAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = storeStatusSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return await revalidatePaths(["/platform"]);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("stores")
    .update({ status: payload.status })
    .eq("id", payload.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/platform"]);
}

export async function switchPlatformCurrentStoreAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = platformScopeSwitchSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return await revalidatePaths(["/", "/platform", "/dashboard"]);
  }

  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, tenant_id, status")
    .eq("id", payload.store_id)
    .maybeSingle();

  if (storeError) throw new Error(storeError.message);
  if (!store) throw new Error("门店不存在。");
  if (store.status !== "active") throw new Error("只能切换到启用中的门店。");

  const now = new Date().toISOString();
  const [profileResult, membershipResult] = await Promise.all([
    admin
      .from("profiles")
      .update({
        tenant_id: store.tenant_id,
        store_id: store.id,
        role: "owner",
        status: "active",
      })
      .eq("id", profile.id),
    admin.from("store_memberships").upsert(
      {
        tenant_id: store.tenant_id,
        store_id: store.id,
        profile_id: profile.id,
        role: "owner",
        status: "active",
        created_at: now,
      },
      { onConflict: "tenant_id,store_id,profile_id" },
    ),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  return await revalidatePaths(["/", "/platform", "/dashboard", "/settings", "/employees"]);
}
