import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatQty(value: number | string | null | undefined, unit?: string | null) {
  const qty = Number(value ?? 0);
  return `${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 3,
  }).format(qty)}${unit ? ` ${unit}` : ""}`;
}
