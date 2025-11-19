import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  const truncated = `${str.slice(0, maxLength)}...`;
  return truncated;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getBaseUrl = () => {
  // Check if we're in a browser environment
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as any).window?.location
  ) {
    return (globalThis as any).window.location.origin;
  }
  if (process.env.FRONTEND_URL) return `${process.env.FRONTEND_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};
