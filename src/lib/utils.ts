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
  if (url && url.trim() !== "") {
    return url;
  }
  const safeSeed = seed || "placeholder";
  return `https://picsum.photos/seed/${safeSeed}/${width}/${height}`;
}
