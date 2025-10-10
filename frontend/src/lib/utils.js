// Helper generik untuk menggabungkan kelas Tailwind tanpa duplikasi
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

// Menggabungkan className dinamis sambil menjaga prioritas utilitas Tailwind
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
