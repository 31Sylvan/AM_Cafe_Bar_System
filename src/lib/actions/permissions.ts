"use server";

import { z } from "zod";
import { revalidateAndReturn } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getDefaultPermissions, permissionCatalog, type PermissionKey } from "@/lib/permissions";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const permissionKeys = permissionCatalog.map((permission) => permission.key) as [PermissionKey, ...PermissionKey[]];

const updateRolePermissionsSchema = z.object({
  role: z.enum(["staff"]),
  permissions: z.array(z.enum(permissionKeys)),
});

export async function updateRolePermissionsAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "permission.manage");

  const role = String(formData.get("role"));
  const selected = formData.getAll("permissions").map(String);
  const payload = updateRolePermissionsSchema.parse({
    role,
    permissions: selected,
  });

  if (!hasSupabaseEnv()) {
    await revalidateAndReturn(["/settings/permissions"], "/settings/permissions");
  }

  const supabase = await createClient();
  const defaults = new Set(getDefaultPermissions(payload.role));
  const selectedSet = new Set(payload.permissions);
  const rows = permissionCatalog.map((permission) => ({
    tenant_id: profile.tenant_id,
    role: payload.role,
    permission_key: permission.key,
    enabled: selectedSet.has(permission.key),
  }));

  if (!selectedSet.has("dashboard.view")) {
    throw new Error("店员至少需要保留查看仪表盘权限。");
  }

  if (selectedSet.size === defaults.size && [...selectedSet].every((permission) => defaults.has(permission))) {
    // Still upsert all rows so a fresh tenant gets an explicit permission matrix.
  }

  const { error } = await supabase.from("role_permissions").upsert(rows, {
    onConflict: "tenant_id,role,permission_key",
  });

  if (error) throw new Error(error.message);

  await revalidateAndReturn(["/settings/permissions", "/"], "/settings/permissions");
}

const memberOverrideSchema = z.object({
  store_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  permission_key: z.enum(permissionKeys),
  effect: z.enum(["allow", "deny"]),
});

export async function upsertMemberPermissionOverrideAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "permission.manage");
  const payload = memberOverrideSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    await revalidateAndReturn(["/settings/permissions"], "/settings/permissions");
  }

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("store_memberships")
    .select("tenant_id, store_id, profile_id")
    .eq("tenant_id", profile.tenant_id)
    .eq("store_id", payload.store_id)
    .eq("profile_id", payload.profile_id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error("该成员不属于当前租户或门店。");

  const { error } = await supabase.from("store_member_permission_overrides").upsert(
    {
      tenant_id: profile.tenant_id,
      store_id: payload.store_id,
      profile_id: payload.profile_id,
      permission_key: payload.permission_key,
      effect: payload.effect,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,store_id,profile_id,permission_key" },
  );

  if (error) throw new Error(error.message);

  await revalidateAndReturn(["/settings/permissions", "/"], "/settings/permissions");
}

export async function deleteMemberPermissionOverrideAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "permission.manage");
  const payload = z.object({
    store_id: z.string().uuid(),
    profile_id: z.string().uuid(),
    permission_key: z.enum(permissionKeys),
  }).parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    await revalidateAndReturn(["/settings/permissions"], "/settings/permissions");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("store_member_permission_overrides")
    .delete()
    .eq("tenant_id", profile.tenant_id)
    .eq("store_id", payload.store_id)
    .eq("profile_id", payload.profile_id)
    .eq("permission_key", payload.permission_key);

  if (error) throw new Error(error.message);

  await revalidateAndReturn(["/settings/permissions", "/"], "/settings/permissions");
}
