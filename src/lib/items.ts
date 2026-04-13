export const CATEGORIES = [
  { value: "alimentar", label: "Alimentar", emoji: "🍎" },
  { value: "saude", label: "Saúde", emoji: "💊" },
] as const;

export type CategoryType = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_LABELS: Record<string, string> = {
  alimentar: "Alimentar",
  saude: "Saúde",
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  alimentar: "🍎",
  saude: "💊",
};

export function formatCategoryLabel(category: string) {
  const label = CATEGORY_LABELS[category] ?? category;
  const emoji = CATEGORY_EMOJIS[category];
  return emoji ? `${emoji} ${label}` : label;
}

export const LOCATIONS = [
  { value: "fridge", label: "Frigorífico" },
  { value: "freezer", label: "Congelador" },
  { value: "pantry", label: "Despensa" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  consumed: "Consumido",
  discarded: "Descartado",
};

export const LOCATION_LABELS = LOCATIONS.reduce<Record<string, string>>(
  (map, item) => {
    map[item.value] = item.label;
    return map;
  },
  {},
);

export const LOCATION_EMOJIS: Record<string, string> = {
  fridge: "🥩",
  freezer: "❄️",
  pantry: "🏠",
};

export function formatLocationLabel(location: string) {
  const label = LOCATION_LABELS[location] ?? location;
  const emoji = LOCATION_EMOJIS[location];
  return emoji ? `${emoji} ${label}` : label;
}

export const STATUS_CLASSES: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  consumed:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  discarded:
    "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
};
