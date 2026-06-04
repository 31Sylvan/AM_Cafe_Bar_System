import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, demoProfile, isDemoAuthEnabled } from "@/lib/demo-auth";
import { getDefaultPermissions, type PermissionKey } from "@/lib/permissions";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!hasSupabaseEnv()) {
    const cookieStore = await cookies();
    if (isDemoAuthEnabled() && cookieStore.get(DEMO_AUTH_COOKIE)?.value === "owner") {
      return demoProfile;
    }

    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, tenant_id, store_id, role, display_name, phone, status")
    .eq("id", user.id)
    .single();

  if (!error && data) {
    const permissions = await getCurrentPermissionKeys(supabase);
    const platformAdmin = await getIsPlatformAdmin(supabase);
    return {
      ...data,
      permissions: platformAdmin
        ? Array.from(new Set([...(permissions.length ? permissions : getDefaultPermissions(data.role)), "platform.manage"]))
        : permissions.length ? permissions : getDefaultPermissions(data.role),
      is_platform_admin: platformAdmin,
    } as Profile;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("profiles")
    .select("id, store_id, role, display_name, phone, status")
    .eq("id", user.id)
    .single();

  if (legacyError || !legacyData) {
    return null;
  }

  return {
    ...legacyData,
    tenant_id: legacyData.store_id,
    permissions: getDefaultPermissions(legacyData.role),
  } as Profile;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export function requireOwner(profile: Profile) {
  if (profile.role !== "owner") {
    redirect("/dashboard");
  }
}

export function requirePermission(profile: Profile, permission: PermissionKey) {
  const permissions = profile.permissions?.length ? profile.permissions : getDefaultPermissions(profile.role);
  if (!permissions.includes(permission)) {
    redirect("/dashboard");
  }
}

export function requirePlatformAdmin(profile: Profile) {
  if (!profile.is_platform_admin && !profile.permissions?.includes("platform.manage")) {
    redirect("/dashboard");
  }
}

async function getCurrentPermissionKeys(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("current_permission_keys");

  if (error || !data) {
    return [] as PermissionKey[];
  }

  return data
    .map((row: { permission_key?: string }) => row.permission_key)
    .filter(Boolean) as PermissionKey[];
}

async function getIsPlatformAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return Boolean(data);
}
