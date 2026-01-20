export type InputMode = "date" | "duration";

export type LocationType = "fridge" | "freezer" | "pantry";

export interface FrequentItem {
  id: string;
  user_id: string;
  name: string;
  input_mode: InputMode;
  default_duration_days: number | null;
  allowed_locations: LocationType[];
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FrequentItemInput {
  name: string;
  input_mode: InputMode;
  default_duration_days: number | null;
  allowed_locations: LocationType[];
}

export interface ProductSuggestion {
  id: string;
  name: string;
  input_mode: InputMode;
  default_duration_days: number | null;
  isFrequent: boolean;
}

export const INPUT_MODE_LABELS: Record<InputMode, string> = {
  duration: "Dura X dias",
  date: "Data específica",
};

export const DURATION_PRESETS = [
  { days: 1, label: "1 dia" },
  { days: 3, label: "3 dias" },
  { days: 7, label: "1 sem" },
  { days: 14, label: "2 sem" },
] as const;

export const DEFAULT_PRODUCTS: Record<LocationType, ProductSuggestion[]> = {
  fridge: [
    { id: "default-iogurte", name: "Iogurte", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-leite", name: "Leite", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-queijo", name: "Queijo", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-manteiga", name: "Manteiga", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-ovos", name: "Ovos", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-fiambre", name: "Fiambre", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-sopa-caseira", name: "Sopa caseira", input_mode: "duration", default_duration_days: 3, isFrequent: false },
    { id: "default-restos", name: "Restos", input_mode: "duration", default_duration_days: 2, isFrequent: false },
    { id: "default-frutas", name: "Frutas", input_mode: "duration", default_duration_days: 5, isFrequent: false },
  ],
  freezer: [
    { id: "default-carne", name: "Carne", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-peixe", name: "Peixe", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-gelado", name: "Gelado", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-pao-congelado", name: "Pão", input_mode: "duration", default_duration_days: 30, isFrequent: false },
    { id: "default-sopa-congelada", name: "Sopa congelada", input_mode: "duration", default_duration_days: 90, isFrequent: false },
  ],
  pantry: [
    { id: "default-arroz", name: "Arroz", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-massa", name: "Massa", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-conservas", name: "Conservas", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-bolachas", name: "Bolachas", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-azeite", name: "Azeite", input_mode: "date", default_duration_days: null, isFrequent: false },
    { id: "default-especiarias", name: "Especiarias", input_mode: "date", default_duration_days: null, isFrequent: false },
  ],
};

export function getDefaultProductsForLocation(
  location: LocationType,
  query: string
): ProductSuggestion[] {
  const products = DEFAULT_PRODUCTS[location] ?? [];
  if (!query) return products;

  const lowerQuery = query.toLowerCase();
  return products.filter((p) =>
    p.name.toLowerCase().includes(lowerQuery)
  );
}

export function frequentItemToSuggestion(item: FrequentItem): ProductSuggestion {
  return {
    id: item.id,
    name: item.name,
    input_mode: item.input_mode,
    default_duration_days: item.default_duration_days,
    isFrequent: true,
  };
}
