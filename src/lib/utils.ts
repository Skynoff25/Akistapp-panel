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

/**
 * Genera un array de etiquetas de búsqueda optimizadas para Firestore array-contains.
 * Normaliza texto, elimina acentos, caracteres especiales y palabras vacías.
 */
export function generateSearchTags(name: string, brand: string, category: string): string[] {
  const stopWords = new Set([
    'de', 'la', 'el', 'con', 'para', 'y', 'en', 'un', 'una', 'los', 'las', 'del', 'al', 
    'por', 'lo', 'como', 'mas', 'sus', 'es', 'se'
  ]);

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9 ]/g, '') // Eliminar caracteres especiales
      .trim();

  // Combinamos todos los campos relevantes para el índice de búsqueda
  const combinedText = `${name} ${brand} ${category}`;
  const normalizedText = normalize(combinedText);
  
  // Dividimos en palabras y filtramos
  const words = normalizedText.split(/\s+/);
  
  const tags = words.filter(word => 
    word.length > 1 && // Ignorar letras sueltas
    !stopWords.has(word) // Ignorar palabras vacías
  );

  // Retornamos array de strings únicos
  return Array.from(new Set(tags));
}
