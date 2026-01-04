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
  active: "bg-emerald-100 text-emerald-800",
  consumed: "bg-blue-100 text-blue-800",
  discarded: "bg-rose-100 text-rose-800",
};
