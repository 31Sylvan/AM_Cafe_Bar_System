import { demoStore } from "@/lib/demo-auth";
import {
  dashboardWidgetDefinitions,
  defaultInterfaceContent,
  navigationDefinitions,
  type DashboardWidgetSetting,
  type InterfaceContentSettings,
  type NavigationSetting,
} from "@/lib/interface-config";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

type NavigationRow = {
  item_key: string;
  label: string | null;
  position: number | null;
  hidden: boolean | null;
  updated_at: string | null;
};

type DashboardWidgetRow = {
  widget_key: string;
  title: string | null;
  position: number | null;
  hidden: boolean | null;
  updated_at: string | null;
};

type ContentRow = {
  content_key: string;
  value: string | null;
};

export type InterfaceSettings = {
  navigation: NavigationSetting[];
  dashboardWidgets: DashboardWidgetSetting[];
  content: InterfaceContentSettings;
};

export async function getInterfaceSettings(storeId?: string): Promise<InterfaceSettings> {
  const fallbackStoreId = storeId ?? demoStore.id;

  if (!hasSupabaseEnv()) {
    return buildInterfaceSettings([], [], []);
  }

  const supabase = await createClient();
  const targetStoreId = storeId ?? (await getCurrentStoreId(supabase)) ?? fallbackStoreId;

  const [navigationResult, dashboardResult, contentResult] = await Promise.all([
    supabase.from("store_navigation_settings").select("item_key,label,position,hidden,updated_at").eq("store_id", targetStoreId),
    supabase.from("store_dashboard_widgets").select("widget_key,title,position,hidden,updated_at").eq("store_id", targetStoreId),
    supabase.from("store_content_overrides").select("content_key,value").eq("store_id", targetStoreId),
  ]);

  return buildInterfaceSettings(
    navigationResult.error ? [] : ((navigationResult.data ?? []) as NavigationRow[]),
    dashboardResult.error ? [] : ((dashboardResult.data ?? []) as DashboardWidgetRow[]),
    contentResult.error ? [] : ((contentResult.data ?? []) as ContentRow[]),
  );
}

function buildInterfaceSettings(
  navigationRows: NavigationRow[],
  dashboardRows: DashboardWidgetRow[],
  contentRows: ContentRow[],
) {
  const navigationByKey = new Map(navigationRows.map((row) => [row.item_key, row]));
  const dashboardByKey = new Map(dashboardRows.map((row) => [row.widget_key, row]));
  const content = { ...defaultInterfaceContent };

  for (const row of contentRows) {
    if (row.content_key in content && typeof row.value === "string") {
      content[row.content_key as keyof InterfaceContentSettings] = row.value;
    }
  }

  return {
    navigation: navigationDefinitions
      .map((definition) => {
        const row = navigationByKey.get(definition.key);
        return {
          ...definition,
          label: row?.label || definition.defaultLabel,
          position: row?.position ?? definition.defaultPosition,
          hidden: row?.hidden ?? false,
          updated_at: row?.updated_at ?? null,
        };
      })
      .sort((a, b) => a.position - b.position),
    dashboardWidgets: dashboardWidgetDefinitions
      .map((definition) => {
        const row = dashboardByKey.get(definition.key);
        return {
          ...definition,
          title: row?.title || definition.defaultTitle,
          position: row?.position ?? definition.defaultPosition,
          hidden: row?.hidden ?? false,
          updated_at: row?.updated_at ?? null,
        };
      })
      .sort((a, b) => a.position - b.position),
    content,
  };
}

async function getCurrentStoreId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("current_store_id");
  if (error) return null;
  return data ?? null;
}
