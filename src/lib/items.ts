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

export const STATUS_CLASSES: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  consumed:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  discarded:
    "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
};
