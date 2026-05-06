import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDisplayName(name: string): string {
  if (!name) return "";
  
  // Replace separators with spaces
  const cleanName = name.replace(/[._]/g, " ");
  
  // Split into words
  const words = cleanName.split(/\s+/);
  
  // Portuguese lowercase exceptions
  const exceptions = ["de", "da", "do", "dos", "das", "e"];
  
  const formattedWords = words.map((word, index) => {
    const lowerWord = word.toLowerCase();
    // Capitalize first word and non-exceptions
    if (index === 0 || !exceptions.includes(lowerWord)) {
      // Basic capitalization - note: this doesn't add accents if they are missing
      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    }
    return lowerWord;
  });
  
  return formattedWords.join(" ");
}
