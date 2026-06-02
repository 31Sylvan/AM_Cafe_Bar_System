import { Search, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function FilterBar({
  action,
  from,
  to,
  selectName,
  selectLabel,
  selectValue,
  selectOptions,
}: {
  action: string;
  from?: string;
  to?: string;
  selectName?: string;
  selectLabel?: string;
  selectValue?: string;
  selectOptions?: { value: string; label: string }[];
}) {
  return (
    <form action={action} className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-stone-200 bg-white p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-stone-500" htmlFor="from">开始日期</label>
        <Input id="from" name="from" type="date" defaultValue={from} className="h-9 w-40" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-stone-500" htmlFor="to">结束日期</label>
        <Input id="to" name="to" type="date" defaultValue={to} className="h-9 w-40" />
      </div>
      {selectName && selectOptions ? (
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-500" htmlFor={selectName}>{selectLabel}</label>
          <Select id={selectName} name={selectName} defaultValue={selectValue ?? "all"} className="h-9 w-40">
            {selectOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      ) : null}
      <Button size="sm">
        <Search className="h-4 w-4" />
        筛选
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={action}>
          <X className="h-4 w-4" />
          清除
        </Link>
      </Button>
    </form>
  );
}
