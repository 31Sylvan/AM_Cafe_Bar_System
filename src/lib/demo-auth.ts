import type { Profile, Store } from "@/lib/types";

export const DEMO_AUTH_COOKIE = "coffee-shop-os-demo-auth";

export function isDemoAuthEnabled() {
  return process.env.DEMO_LOGIN_ENABLED !== "false";
}

export function getDemoCredentials() {
  return {
    email: process.env.DEMO_LOGIN_EMAIL ?? "owner@aromamelody.local",
    password: process.env.DEMO_LOGIN_PASSWORD ?? "Aroma@2026!",
  };
}

export const demoProfile: Profile = {
  id: "00000000-0000-0000-0000-0000000000aa",
  store_id: "00000000-0000-0000-0000-000000000001",
  role: "owner",
  display_name: "老板",
  phone: null,
  status: "active",
};

export const demoStore: Store = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Aroma Melody Cafe & Bar",
  business_mode: "早咖夜酒",
  address: "社区二楼",
  timezone: "Asia/Shanghai",
  status: "active",
  created_at: new Date(0).toISOString(),
};
