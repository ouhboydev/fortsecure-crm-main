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

/**
 * Converte strings monetárias brasileiras (ex: "R$ 1.234,56") em números (1234.56)
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value) return 0;

  // Remove R$, espaços e pontos de milhar
  let cleanValue = value.replace(/[R$\s.]/g, "");
  
  // Substitui vírgula decimal por ponto
  cleanValue = cleanValue.replace(",", ".");
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata um número ou string para o padrão de moeda brasileiro (R$ 1.234,56)
 */
export function formatCurrencyBRL(value: number | string): string {
  const number = typeof value === "string" ? parseCurrency(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number || 0);
}
