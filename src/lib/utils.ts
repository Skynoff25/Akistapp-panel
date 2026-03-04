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
 * Implementa N-Grams (prefijos) para permitir búsquedas parciales desde 3 caracteres.
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
  
  // Dividimos en palabras
  const words = normalizedText.split(/\s+/);
  
  const tags = new Set<string>();

  words.forEach(word => {
    // Si es una stop word o está vacía, la ignoramos
    if (!word || stopWords.has(word)) return;

    // Generamos prefijos (N-Grams) desde 3 caracteres hasta el final de la palabra
    // Ej: "zapatos" -> "zap", "zapa", "zapat", "zapato", "zapatos"
    if (word.length >= 3) {
        for (let i = 3; i <= word.length; i++) {
            tags.add(word.substring(0, i));
        }
    } else if (word.length > 0) {
        // Para palabras cortas (1-2 letras) que no son stop words (ej: "lg", "hp", "xi"), 
        // las añadimos completas para que sean encontrables.
        tags.add(word);
    }
  });

  // Retornamos array de strings únicos
  return Array.from(tags);
}
