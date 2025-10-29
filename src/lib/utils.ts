import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function addDays(base: Date, days: number): Date {
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return result
}
