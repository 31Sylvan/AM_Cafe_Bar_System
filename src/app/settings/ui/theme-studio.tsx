"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Coffee, Download, Package, RotateCcw, Save, ShoppingCart, Sparkles, Upload } from "lucide-react";
import { applyUiTheme, defaultUiTheme, readStoredUiTheme, THEME_STORAGE_KEY, type UiThemeConfig } from "@/components/app/theme-style-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const presets: Array<{ name: string; description: string; config: UiThemeConfig }> = [
  {
    name: "Aroma Classic",
    description: "深绿色 + 焦糖色，适合当前咖啡店后台。",
    config: defaultUiTheme,
  },
  {
    name: "Night Bar",
    description: "夜酒模式，更深的品牌色和金色强调。",
    config: {
      ...defaultUiTheme,
      brand: "#17201b",
      brandStrong: "#0d1511",
      accent: "#d6a557",
      accentSoft: "#f4e6c8",
      background: "#f4efe7",
      card: "#fff8ed",
      line: "#e8d8bd",
    },
  },
  {
    name: "Clean Ledger",
    description: "更克制的财务后台风格。",
    config: {
      ...defaultUiTheme,
      brand: "#1f2937",
      brandStrong: "#111827",
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      background: "#f8fafc",
      card: "#ffffff",
      line: "#e2e8f0",
    },
  },
];

const fields: Array<{ key: keyof UiThemeConfig; label: string; type: "color" | "range"; min?: string; max?: string; step?: string; unit?: string }> = [
  { key: "brand", label: "品牌主色", type: "color" },
  { key: "brandStrong", label: "品牌深色", type: "color" },
  { key: "accent", label: "强调色", type: "color" },
  { key: "accentSoft", label: "强调浅色", type: "color" },
  { key: "background", label: "页面背景", type: "color" },
  { key: "card", label: "卡片背景", type: "color" },
  { key: "line", label: "边框颜色", type: "color" },
  { key: "radiusMd", label: "圆角", type: "range", min: "4", max: "16", step: "1", unit: "px" },
  { key: "controlHeight", label: "控件高度", type: "range", min: "34", max: "48", step: "1", unit: "px" },
  { key: "iconStroke", label: "图标线宽", type: "range", min: "1.5", max: "2.75", step: "0.25" },
];

function stripUnit(value: string) {
  return value.replace(/[^\d.]/g, "");
}

export function ThemeStudio() {
  const [theme, setTheme] = useState<UiThemeConfig>(() => readStoredUiTheme());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyUiTheme(theme);
  }, [theme]);

  const cssPreview = useMemo(() => {
    return `:root {\n  --brand: ${theme.brand};\n  --accent: ${theme.accent};\n  --radius-md: ${theme.radiusMd};\n  --icon-stroke: ${theme.iconStroke};\n}`;
  }, [theme]);

  function update(next: UiThemeConfig) {
    setTheme(next);
    applyUiTheme(next);
    setSaved(false);
  }

  function updateField(key: keyof UiThemeConfig, value: string, unit?: string) {
    update({
      ...theme,
      [key]: unit ? `${value}${unit}` : value,
    });
  }

  function save() {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    applyUiTheme(theme);
    setSaved(true);
  }

  function reset() {
    localStorage.removeItem(THEME_STORAGE_KEY);
    update(defaultUiTheme);
    setSaved(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>主题预设</CardTitle>
            <CardDescription>选择一个基础方向，再微调颜色、圆角和图标。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => update(preset.config)}
                className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--line)] bg-white/60 p-3 text-left transition hover:bg-white"
              >
                <span>
                  <span className="block text-sm font-semibold">{preset.name}</span>
                  <span className="mt-1 block text-xs text-stone-500">{preset.description}</span>
                </span>
                <span className="flex gap-1">
                  <span className="h-5 w-5 rounded-full" style={{ background: preset.config.brand }} />
                  <span className="h-5 w-5 rounded-full" style={{ background: preset.config.accent }} />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>样式变量</CardTitle>
            <CardDescription>调整后会实时作用到当前系统界面。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <span className="text-xs text-stone-500">{theme[field.key]}</span>
                </div>
                {field.type === "color" ? (
                  <Input
                    id={field.key}
                    type="color"
                    value={theme[field.key]}
                    onChange={(event) => updateField(field.key, event.currentTarget.value)}
                    className="p-1"
                  />
                ) : (
                  <Input
                    id={field.key}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={stripUnit(theme[field.key])}
                    onChange={(event) => updateField(field.key, event.currentTarget.value, field.unit)}
                  />
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={save}>
                <Save className="h-4 w-4" />
                保存样式
              </Button>
              <Button type="button" variant="secondary" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                恢复默认
              </Button>
            </div>
            {saved ? <div className="text-sm text-emerald-700">已保存到当前浏览器，下次打开仍会生效。</div> : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>组件预览</CardTitle>
            <CardDescription>Button、Badge、Input、Select 和 Table 都使用当前样式变量。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Button</h3>
              <div className="flex flex-wrap gap-2">
                <Button><Upload className="h-4 w-4" />主按钮</Button>
                <Button variant="secondary"><Download className="h-4 w-4" />次按钮</Button>
                <Button variant="ghost"><Sparkles className="h-4 w-4" />幽灵按钮</Button>
                <Button variant="danger">危险操作</Button>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preview-input">Input</Label>
                <Input id="preview-input" value="Aroma Melody" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-select">Select</Label>
                <Select id="preview-select" value="owner" disabled>
                  <option value="owner">老板权限</option>
                  <option value="staff">店员权限</option>
                </Select>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Badge</h3>
              <div className="flex flex-wrap gap-2">
                <Badge>默认</Badge>
                <Badge variant="success">正常</Badge>
                <Badge variant="warning">预警</Badge>
                <Badge variant="danger">异常</Badge>
                <Badge variant="muted">停用</Badge>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Lucide Icon</h3>
              <div className="flex flex-wrap gap-3">
                {[Coffee, Package, ShoppingCart, Bell, Sparkles].map((Icon, index) => (
                  <div key={index} className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--card)] text-[var(--brand)]">
                    <Icon className="h-5 w-5" />
                  </div>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>

        <TableContainer>
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>组件</TableHead>
                <TableHead>用途</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Button</TableCell>
                <TableCell>主要操作、次要操作、危险操作</TableCell>
                <TableCell><Badge variant="success">已接入</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Lucide Icons</TableCell>
                <TableCell>导航、操作、指标卡和状态提示</TableCell>
                <TableCell><Badge variant="success">已接入</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Theme Tokens</TableCell>
                <TableCell>颜色、圆角、控件高度、图标线宽</TableCell>
                <TableCell><Badge variant="warning">本地保存</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Card>
          <CardHeader>
            <CardTitle>CSS 变量预览</CardTitle>
            <CardDescription>开发时可以直接复用这些 token。</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-stone-950 p-4 text-xs leading-6 text-stone-100">{cssPreview}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
