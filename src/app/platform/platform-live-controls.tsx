"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";
import type { RecordStatus, StoreModuleEntitlement } from "@/lib/types";

const statusLabels = {
  active: "启用",
  inactive: "暂停",
  disabled: "停用",
} as const;

function statusVariant(status: RecordStatus) {
  return status === "active" ? "success" : status === "disabled" ? "danger" : "warning";
}

export function StoreStatusControl({
  storeId,
  initialStatus,
  action,
}: {
  storeId: string;
  initialStatus: RecordStatus;
  action: (formData: FormData) => Promise<unknown>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      <Badge variant={statusVariant(status)} className="w-fit justify-self-end">
        {statusLabels[status]}
      </Badge>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const nextStatus = String(new FormData(form).get("status")) as RecordStatus;
          const previousStatus = status;
          setStatus(nextStatus);
          setError(null);
          startTransition(async () => {
            try {
              await action(new FormData(form));
              setSavedAt(new Date().toLocaleTimeString("zh-CN"));
              router.refresh();
            } catch {
              setStatus(previousStatus);
              setError("保存失败");
            }
          });
        }}
        className="flex justify-end gap-2"
      >
        <input type="hidden" name="store_id" value={storeId} />
        <Select name="status" value={status} onChange={(event) => setStatus(event.target.value as RecordStatus)} className="w-28">
          <option value="active">启用</option>
          <option value="inactive">暂停</option>
          <option value="disabled">停用</option>
        </Select>
        <Button size="sm" variant="secondary" disabled={isPending}>{isPending ? "保存中" : "保存"}</Button>
      </form>
      {error ? <div className="text-right text-xs text-red-600">{error}</div> : null}
      {savedAt && !error ? <div className="text-right text-xs text-emerald-700">已保存 {savedAt}</div> : null}
    </div>
  );
}

export function StoreModuleQuickForm({
  stores,
  modules,
  action,
}: {
  stores: Array<{ id: string; label: string }>;
  modules: Array<{ key: string; name: string }>;
  action: (formData: FormData) => Promise<unknown>;
}) {
  const router = useRouter();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedModuleKey, setSelectedModuleKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const selectedModule = modules.find((module) => module.key === selectedModuleKey);

  return (
    <div className="space-y-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          setError(null);
          startTransition(async () => {
            try {
              await action(new FormData(form));
              setLastSaved(
                `${selectedStore?.label ?? "门店"} · ${selectedModule?.name ?? "模块"} 已${enabled ? "开通" : "关闭"}`,
              );
              router.refresh();
            } catch {
              setError("保存失败，请检查门店、模块和权限配置。");
            }
          });
        }}
        className="grid gap-3 lg:grid-cols-[1.2fr_1fr_160px_1.4fr_auto]"
      >
        <Select name="store_id" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)} required>
          <option value="">选择门店</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.label}
            </option>
          ))}
        </Select>
        <Select name="module_key" value={selectedModuleKey} onChange={(event) => setSelectedModuleKey(event.target.value)} required>
          <option value="">选择模块</option>
          {modules.map((module) => (
            <option key={module.key} value={module.key}>
              {module.name}
            </option>
          ))}
        </Select>
        <Select name="enabled" value={String(enabled)} onChange={(event) => setEnabled(event.target.value === "true")} required>
          <option value="true">开通</option>
          <option value="false">关闭</option>
        </Select>
        <Input value={note} onChange={(event) => setNote(event.target.value)} name="note" placeholder="备注，例如：专业版套餐" />
        <Button disabled={isPending}>{isPending ? "保存中" : "保存开通"}</Button>
      </form>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {lastSaved && !error ? <div className="text-sm text-emerald-700">{lastSaved}</div> : null}
    </div>
  );
}

export function StoreModuleEntitlementCells({
  storeId,
  moduleKey,
  entitlement,
  action,
}: {
  storeId: string;
  moduleKey: string;
  entitlement?: StoreModuleEntitlement;
  action: (formData: FormData) => Promise<unknown>;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(entitlement?.enabled ?? true);
  const [note, setNote] = useState(entitlement?.note ?? "");
  const [updatedAt, setUpdatedAt] = useState(entitlement?.updated_at ?? "");
  const [hasExplicitConfig, setHasExplicitConfig] = useState(Boolean(entitlement));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <TableCell>
        <Badge variant={enabled ? "success" : "danger"}>
          {hasExplicitConfig ? (enabled ? "开通" : "关闭") : "默认开通"}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[260px] text-sm text-stone-600">
        {note || "-"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-stone-500">
        {updatedAt ? new Date(updatedAt).toLocaleString("zh-CN") : "-"}
      </TableCell>
      <TableCell>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const nextEnabled = formData.get("enabled") === "true";
            const nextNote = String(formData.get("note") ?? "").trim();
            const nextUpdatedAt = new Date().toISOString();
            const previous = { enabled, note, updatedAt, hasExplicitConfig };
            setEnabled(nextEnabled);
            setNote(nextNote);
            setUpdatedAt(nextUpdatedAt);
            setHasExplicitConfig(true);
            setError(null);
            startTransition(async () => {
              try {
                await action(formData);
                router.refresh();
              } catch {
                setEnabled(previous.enabled);
                setNote(previous.note);
                setUpdatedAt(previous.updatedAt);
                setHasExplicitConfig(previous.hasExplicitConfig);
                setError("保存失败");
              }
            });
          }}
          className="flex justify-end gap-2"
        >
          <input type="hidden" name="store_id" value={storeId} />
          <input type="hidden" name="module_key" value={moduleKey} />
          <Select name="enabled" value={String(enabled)} onChange={(event) => setEnabled(event.target.value === "true")} className="w-28">
            <option value="true">开通</option>
            <option value="false">关闭</option>
          </Select>
          <Input name="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="备注" className="w-44" />
          <Button size="sm" variant="secondary" disabled={isPending}>{isPending ? "保存中" : "保存"}</Button>
        </form>
        {error ? <div className="mt-2 text-right text-xs text-red-600">{error}</div> : null}
      </TableCell>
    </>
  );
}
