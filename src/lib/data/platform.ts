import { requirePlatformAdmin, requireProfile } from "@/lib/auth";
import { platformModules } from "@/lib/platform";
import { createAdminClient, createClient, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/server";
import type { PlatformStoreOverview, StoreModuleEntitlement, Tenant } from "@/lib/types";

export type PlatformDashboardData = {
  adminReady: boolean;
  tenants: Tenant[];
  stores: PlatformStoreOverview[];
  entitlements: StoreModuleEntitlement[];
  moduleKeys: string[];
};

export async function getPlatformDashboardData(): Promise<PlatformDashboardData> {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);

  if (!hasSupabaseEnv() || !hasSupabaseAdminEnv()) {
    return {
      adminReady: false,
      tenants: [],
      stores: [],
      entitlements: [],
      moduleKeys: platformModules.map((module) => module.key),
    };
  }

  const admin = createAdminClient();
  const [tenantsResult, storesResult, entitlementsResult] = await Promise.all([
    admin.from("tenants").select("*").order("created_at", { ascending: false }),
    admin
      .from("stores")
      .select("*, tenants!stores_tenant_id_fkey(id, name, slug, status), store_memberships(id, role, status, profile_id), store_module_entitlements(*)")
      .order("created_at", { ascending: false }),
    admin.from("store_module_entitlements").select("*").order("updated_at", { ascending: false }),
  ]);

  if (tenantsResult.error) throw new Error(tenantsResult.error.message);
  if (storesResult.error) throw new Error(storesResult.error.message);
  if (entitlementsResult.error) throw new Error(entitlementsResult.error.message);

  return {
    adminReady: true,
    tenants: (tenantsResult.data ?? []) as Tenant[],
    stores: (storesResult.data ?? []) as PlatformStoreOverview[],
    entitlements: (entitlementsResult.data ?? []) as StoreModuleEntitlement[],
    moduleKeys: platformModules.map((module) => module.key),
  };
}

export async function getIsCurrentUserPlatformAdmin() {
  if (!hasSupabaseEnv()) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return Boolean(data);
}
