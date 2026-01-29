import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(
  url: string | null | undefined,
  seed?: string,
  width = 64,
  height = 64
): string {
  if (typeof url === 'string' && url.trim().startsWith('http')) {
    return url;
  }
  const safeSeed = String(seed || "placeholder");
  return `https://picsum.photos/seed/${safeSeed}/${width}/${height}`;
}
