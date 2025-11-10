"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "glass" | "tinted" | "subtle";
type Padding = "none" | "base";

type KiboPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  padding?: Padding;
};

const variantMap: Record<Variant, string> = {
  glass:
    "border-white/60 bg-white/70 text-slate-900 shadow-[0_25px_80px_-60px_rgba(15,23,42,0.85)] backdrop-blur-3xl dark:border-white/10 dark:bg-zinc-900/65 dark:text-zinc-50",
  tinted:
    "bg-gradient-to-br from-[#eff6ff]/90 via-white/85 to-[#f5f3ff]/80 text-slate-900 shadow-[0_40px_120px_-70px_rgba(59,130,246,0.85)] backdrop-blur-2xl dark:from-[#081229]/90 dark:via-[#0f172a]/80 dark:to-[#1e1b4b]/80 dark:text-slate-50 border-white/40 dark:border-white/10",
  subtle:
    "border-white/50 bg-white/60 text-slate-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/5 dark:bg-zinc-950/50 dark:text-slate-50",
};

const paddingMap: Record<Padding, string> = {
  none: "",
  base: "p-6 sm:p-8",
};

export function KiboPanel({
  className,
  variant = "glass",
  padding = "base",
  ...props
}: KiboPanelProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border transition-colors duration-300",
        variantMap[variant],
        paddingMap[padding],
        className
      )}
      {...props}
    />
  );
}

type Tone = "neutral" | "blue" | "emerald" | "amber";

type KiboBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

const toneMap: Record<Tone, string> = {
  neutral:
    "border-white/60 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
  blue:
    "border-sky-200/80 bg-sky-50/80 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200",
  emerald:
    "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100",
  amber:
    "border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100",
};

export function KiboBadge({
  className,
  tone = "neutral",
  ...props
}: KiboBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        toneMap[tone],
        className
      )}
      {...props}
    />
  );
}
