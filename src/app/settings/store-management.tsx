"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreMembership } from "@/lib/types";

export function StoreArchiveForm({
  membership,
  isCurrent,
  canArchive,
  action,
}: {
  membership: StoreMembership;
  isCurrent: boolean;
  canArchive: boolean;
  action: (formData: FormData) => Promise<unknown>;
}) {
  const store = membership.stores;
  const storeName = store?.name ?? membership.store_id;
  const [confirmName, setConfirmName] = useState("");
  const disabled = isCurrent || !canArchive || confirmName !== storeName;

  return (
    <ReactiveForm action={action} successText="门店已停用" errorText="停用失败" className="mt-4 border-t border-stone-200 pt-4">
      <input type="hidden" name="store_id" value={membership.store_id} />
      <div className="flex flex-col gap-2">
        <div className="text-xs leading-5 text-stone-500">
          {isCurrent ? "当前正在使用的门店不能删除。" : canArchive ? `输入“${storeName}”确认停用。` : "当前租户至少需要保留一家启用门店。"}
        </div>
        <div className="flex gap-2">
          <Input
            name="confirm_name"
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={storeName}
            disabled={isCurrent || !canArchive}
          />
          <Button type="submit" size="sm" variant="secondary" disabled={disabled}>
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
        </div>
      </div>
    </ReactiveForm>
  );
}

export function StoreStatusBadge({ isCurrent, role }: { isCurrent: boolean; role: StoreMembership["role"] }) {
  if (isCurrent) {
    return <Badge className="border-emerald-200 bg-white text-emerald-800">当前</Badge>;
  }

  return <Badge className="border-stone-200 bg-white text-stone-600">{role === "owner" ? "老板" : "店员"}</Badge>;
}
