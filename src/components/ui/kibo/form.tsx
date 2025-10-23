"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type FormProps = React.HTMLAttributes<HTMLDivElement>;

export function KiboForm({ className, ...props }: FormProps) {
  return (
    <div
      className={cn(
        "grid gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
      {...props}
    />
  );
}

type FormHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function KiboFormHeader({ className, ...props }: FormHeaderProps) {
  return (
    <div
      className={cn("space-y-2 border-b border-zinc-200 pb-4 dark:border-zinc-800", className)}
      {...props}
    />
  );
}

type FormTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function KiboFormTitle({ className, ...props }: FormTitleProps) {
  return (
    <h2
      className={cn("text-lg font-semibold text-zinc-900 dark:text-zinc-50", className)}
      {...props}
    />
  );
}

type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function KiboFormDescription({
  className,
  ...props
}: FormDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-zinc-600 dark:text-zinc-400", className)}
      {...props}
    />
  );
}

type FormBodyProps = React.HTMLAttributes<HTMLDivElement>;

export function KiboFormBody({ className, ...props }: FormBodyProps) {
  return (
    <div className={cn("grid gap-4", className)} {...props} />
  );
}

type FormFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function KiboFormFooter({ className, ...props }: FormFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:flex-row md:items-center md:justify-between",
        className
      )}
      {...props}
    />
  );
}
