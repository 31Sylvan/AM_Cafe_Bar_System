import { requirePlatformAdmin, requireProfile } from "@/lib/auth";
import { platformModules } from "@/lib/platform";
import { createAdminClient, createClient, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/server";
import type { PlatformStoreOverview, StoreMembership, StoreModuleEntitlement, Tenant } from "@/lib/types";

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
  const [tenantsResult, storesResult, membershipsResult, entitlementsResult] = await Promise.all([
    admin.from("tenants").select("*").order("created_at", { ascending: false }),
    admin.from("stores").select("*").order("created_at", { ascending: false }),
    admin.from("store_memberships").select("id, tenant_id, store_id, role, status, profile_id"),
    admin.from("store_module_entitlements").select("*").order("updated_at", { ascending: false }),
  ]);

  if (tenantsResult.error) throw new Error(tenantsResult.error.message);
  if (storesResult.error) throw new Error(storesResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (entitlementsResult.error) throw new Error(entitlementsResult.error.message);

  const tenants = (tenantsResult.data ?? []) as Tenant[];
  const memberships = (membershipsResult.data ?? []) as StoreMembership[];
  const entitlements = (entitlementsResult.data ?? []) as StoreModuleEntitlement[];
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const membershipsByStoreId = groupByStoreId(memberships);
  const entitlementsByStoreId = groupByStoreId(entitlements);

  return {
    adminReady: true,
    tenants,
    stores: ((storesResult.data ?? []) as PlatformStoreOverview[]).map((store) => ({
      ...store,
      tenants: tenantById.get(store.tenant_id) ?? null,
      store_memberships: membershipsByStoreId.get(store.id) ?? [],
      store_module_entitlements: entitlementsByStoreId.get(store.id) ?? [],
    })),
    entitlements,
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

function groupByStoreId<T extends { store_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    grouped.set(row.store_id, [...(grouped.get(row.store_id) ?? []), row]);
  }
  return grouped;
}
