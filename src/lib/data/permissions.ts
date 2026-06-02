import { requireProfile } from "@/lib/auth";
import { getDefaultPermissions, permissionCatalog, type PermissionKey } from "@/lib/permissions";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoProfile, demoStore } from "@/lib/demo-auth";
import type { MemberPermissionOverride, StoreMembership, UserRole } from "@/lib/types";

export type RolePermissionState = Record<UserRole, PermissionKey[]>;

export async function getRolePermissionState(): Promise<RolePermissionState> {
  const profile = await requireProfile();

  if (!hasSupabaseEnv()) {
    return {
      owner: getDefaultPermissions("owner"),
      staff: getDefaultPermissions("staff"),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role, permission_key, enabled")
    .eq("tenant_id", profile.tenant_id);

  if (error || !data.length) {
    return {
      owner: getDefaultPermissions("owner"),
      staff: getDefaultPermissions("staff"),
    };
  }

  const state: RolePermissionState = { owner: [], staff: [] };
  for (const row of data) {
    const key = row.permission_key as PermissionKey;
    const role: UserRole | null = row.role === "owner" || row.role === "staff" ? row.role : null;
    if (!permissionCatalog.some((permission) => permission.key === key)) continue;
    if (row.enabled && role) {
      state[role].push(key);
    }
  }

  return {
    owner: state.owner.length ? state.owner : getDefaultPermissions("owner"),
    staff: state.staff.length ? state.staff : getDefaultPermissions("staff"),
  };
}

export async function getPermissionManagementData() {
  const profile = await requireProfile();
  const rolePermissions = await getRolePermissionState();

  if (!hasSupabaseEnv()) {
    return {
      rolePermissions,
      memberships: [
        {
          id: "demo-membership",
          tenant_id: demoStore.tenant_id,
          store_id: demoStore.id,
          profile_id: demoProfile.id,
          role: demoProfile.role,
          status: "active",
          created_at: new Date(0).toISOString(),
          stores: demoStore,
          profiles: demoProfile,
        },
      ] satisfies StoreMembership[],
      overrides: [] satisfies MemberPermissionOverride[],
    };
  }

  const supabase = await createClient();
  const [membershipsResult, overridesResult] = await Promise.all([
    supabase
      .from("store_memberships")
      .select("*, stores(id, name, tenant_id, business_mode, address, timezone, status, created_at), profiles(id, display_name, phone, role, status)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("store_member_permission_overrides")
      .select("*, profiles(id, display_name, phone, role, status), stores(id, name)")
      .eq("tenant_id", profile.tenant_id)
      .order("updated_at", { ascending: false }),
  ]);

  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (overridesResult.error) throw new Error(overridesResult.error.message);

  return {
    rolePermissions,
    memberships: membershipsResult.data as StoreMembership[],
    overrides: overridesResult.data as MemberPermissionOverride[],
  };
}
