"use client";

import { GripVertical, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardWidgetSetting, NavigationSetting } from "@/lib/interface-config";

type SortableItem = {
  key: string;
  label: string;
  title?: string;
  helper: string;
  meta: string;
  hidden: boolean;
};

export function NavigationConfigForm({
  items,
  action,
}: {
  items: NavigationSetting[];
  action: (formData: FormData) => Promise<void>;
}) {
  const initialItems = useMemo<SortableItem[]>(
    () =>
      items.map((item) => ({
        key: item.key,
        label: item.label,
        helper: item.href,
        meta: item.permission,
        hidden: item.hidden,
      })),
    [items],
  );

  return (
    <SortableConfigForm
      items={initialItems}
      action={action}
      keyField="item_key"
      labelField="nav_label"
      positionField="nav_position"
      hiddenField="nav_hidden"
      labelPlaceholder="菜单名称"
    />
  );
}

export function DashboardWidgetConfigForm({
  items,
  action,
}: {
  items: DashboardWidgetSetting[];
  action: (formData: FormData) => Promise<void>;
}) {
  const initialItems = useMemo<SortableItem[]>(
    () =>
      items.map((item) => ({
        key: item.key,
        label: item.title,
        helper: item.zone === "metric" ? "指标卡" : item.zone === "panel" ? "信息面板" : "排行榜",
        meta: item.key,
        hidden: item.hidden,
      })),
    [items],
  );

  return (
    <SortableConfigForm
      items={initialItems}
      action={action}
      keyField="widget_key"
      labelField="widget_title"
      positionField="widget_position"
      hiddenField="widget_hidden"
      labelPlaceholder="组件标题"
    />
  );
}

function SortableConfigForm({
  items,
  action,
  keyField,
  labelField,
  positionField,
  hiddenField,
  labelPlaceholder,
}: {
  items: SortableItem[];
  action: (formData: FormData) => Promise<void>;
  keyField: string;
  labelField: string;
  positionField: string;
  hiddenField: string;
  labelPlaceholder: string;
}) {
  const [rows, setRows] = useState(items);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  function moveItem(fromKey: string, toKey: string) {
    setRows((current) => {
      const fromIndex = current.findIndex((item) => item.key === fromKey);
      const toIndex = current.findIndex((item) => item.key === toKey);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;

      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  function updateRow(key: string, patch: Partial<SortableItem>) {
    setRows((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <form
      action={action}
      className="space-y-3"
    >
      <div className="space-y-2">
        {rows.map((item, index) => (
          <div
            key={item.key}
            draggable
            onDragStart={() => setDraggedKey(item.key)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedKey) moveItem(draggedKey, item.key);
              setDraggedKey(null);
            }}
            className="grid gap-3 rounded-md border border-[var(--line)] bg-stone-50 p-3 transition hover:border-[var(--accent)] md:grid-cols-[32px_1fr_140px]"
          >
            <input type="hidden" name={keyField} value={item.key} />
            <input type="hidden" name={positionField} value={(index + 1) * 10} />
            <div className="flex items-center justify-between md:justify-center">
              <GripVertical className="h-4 w-4 cursor-grab text-stone-400" />
              <span className="text-xs text-stone-400 md:hidden">#{index + 1}</span>
            </div>
            <div className="min-w-0">
              <Input
                name={labelField}
                value={item.label}
                placeholder={labelPlaceholder}
                onChange={(event) => updateRow(item.key, { label: event.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                <span className="rounded bg-white px-2 py-1 font-mono">{item.key}</span>
                <span className="rounded bg-white px-2 py-1">{item.helper}</span>
                <span className="rounded bg-white px-2 py-1">{item.meta}</span>
              </div>
            </div>
            <label className="flex items-center justify-between rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-stone-700 md:justify-center md:gap-2">
              <input
                type="checkbox"
                name={hiddenField}
                value={item.key}
                checked={item.hidden}
                onChange={(event) => updateRow(item.key, { hidden: event.target.checked })}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              隐藏
            </label>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4" />
          保存配置
        </Button>
      </div>
    </form>
  );
}

export function ResetInterfaceButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button variant="secondary">
        <RotateCcw className="h-4 w-4" />
        恢复默认配置
      </Button>
    </form>
  );
}
