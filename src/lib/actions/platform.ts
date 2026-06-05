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

const platformTenantSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/),
  status: z.enum(["active", "inactive", "disabled"]).default("active"),
});

const platformTenantUpdateSchema = platformTenantSchema.extend({
  tenant_id: postgresUuid,
});

const platformStoreSchema = z.object({
  tenant_id: postgresUuid,
  name: z.string().trim().min(1),
  business_mode: z.string().trim().min(1),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(1),
  status: z.enum(["active", "inactive", "disabled"]).default("active"),
});

const platformStoreUpdateSchema = platformStoreSchema.extend({
  store_id: postgresUuid,
});

const storeStatusSchema = z.object({
  store_id: postgresUuid,
  status: z.enum(["active", "inactive", "disabled"]),
});

const platformScopeSwitchSchema = z.object({
  store_id: postgresUuid,
});

export async function createPlatformTenantAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = platformTenantSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return await revalidatePaths(["/platform"]);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").insert(payload);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/platform", "/settings"]);
}

export async function updatePlatformTenantAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = platformTenantUpdateSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return await revalidatePaths(["/platform"]);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      name: payload.name,
      slug: payload.slug,
      status: payload.status,
    })
    .eq("id", payload.tenant_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/platform", "/settings"]);
}

export async function createPlatformStoreAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = platformStoreSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return await revalidatePaths(["/platform"]);
  }

  const admin = createAdminClient();
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("id")
    .eq("id", payload.tenant_id)
    .maybeSingle();

  if (tenantError) throw new Error(tenantError.message);
  if (!tenant) throw new Error("租户不存在。");

  const { data: store, error } = await admin
    .from("stores")
    .insert({
      tenant_id: payload.tenant_id,
      name: payload.name,
      business_mode: payload.business_mode,
      address: payload.address || null,
      timezone: payload.timezone,
      status: payload.status,
    })
    .select("id")
    .single();

  if (error || !store) throw new Error(error?.message ?? "创建门店失败");

  const { error: membershipError } = await admin.from("store_memberships").upsert(
    {
      tenant_id: payload.tenant_id,
      store_id: store.id,
      profile_id: profile.id,
      role: "owner",
      status: "active",
    },
    { onConflict: "tenant_id,store_id,profile_id" },
  );

  if (membershipError) throw new Error(membershipError.message);
  return await revalidatePaths(["/platform", "/settings"]);
}

export async function updatePlatformStoreAction(formData: FormData) {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const payload = platformStoreUpdateSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return await revalidatePaths(["/platform"]);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("stores")
    .update({
      tenant_id: payload.tenant_id,
      name: payload.name,
      business_mode: payload.business_mode,
      address: payload.address || null,
      timezone: payload.timezone,
      status: payload.status,
    })
    .eq("id", payload.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/platform", "/settings"]);
}

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
