/**
 * LEARNER'S NOTE:
 * utils.ts provides the cn() utility function used throughout the codebase.
 *
 * KEY CONCEPTS:
 * - clsx: A utility for constructing className strings conditionally
 * - tailwind-merge (twMerge): Merges Tailwind CSS classes intelligently (handles conflicts)
 * - Variadic function: cn(...inputs) accepts any number of ClassValue arguments
 * - Usage: Used in components like NavLink to merge conditional classNames
 *
 * Example: cn("text-red-500", isActive && "font-bold", "px-4")
 * Result: "text-red-500 font-bold px-4" (clsx) then merged (twMerge)
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
