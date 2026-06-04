"use client";

import { useEffect } from "react";

export const THEME_STORAGE_KEY = "coffee-shop-os-ui-theme";

export type UiThemeConfig = {
  brand: string;
  brandStrong: string;
  accent: string;
  accentSoft: string;
  background: string;
  card: string;
  line: string;
  radiusMd: string;
  controlHeight: string;
  iconStroke: string;
};

export const defaultUiTheme: UiThemeConfig = {
  brand: "#0d3028",
  brandStrong: "#0b2f27",
  accent: "#c97935",
  accentSoft: "#f3dfc7",
  background: "#f7f3ec",
  card: "#fffaf3",
  line: "#e7d9c8",
  radiusMd: "8px",
  controlHeight: "40px",
  iconStroke: "2",
};

export function applyUiTheme(config: UiThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--brand", config.brand);
  root.style.setProperty("--brand-strong", config.brandStrong);
  root.style.setProperty("--accent", config.accent);
  root.style.setProperty("--accent-soft", config.accentSoft);
  root.style.setProperty("--background", config.background);
  root.style.setProperty("--card", config.card);
  root.style.setProperty("--line", config.line);
  root.style.setProperty("--radius-md", config.radiusMd);
  root.style.setProperty("--control-height", config.controlHeight);
  root.style.setProperty("--icon-stroke", config.iconStroke);
}

export function readStoredUiTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return defaultUiTheme;
    return { ...defaultUiTheme, ...JSON.parse(raw) } as UiThemeConfig;
  } catch {
    return defaultUiTheme;
  }
}

export function ThemeStyleProvider() {
  useEffect(() => {
    const storedTheme = readStoredUiTheme();
    applyUiTheme(storedTheme);

    let active = true;
    fetch("/api/settings/ui-theme", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { theme?: Partial<UiThemeConfig> | null } | null) => {
        if (!active || !payload?.theme) return;
        const cloudTheme = { ...defaultUiTheme, ...payload.theme };
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(cloudTheme));
        applyUiTheme(cloudTheme);
      })
      .catch(() => {
        applyUiTheme(storedTheme);
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
