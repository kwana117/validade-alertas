"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LOCATIONS, formatLocationLabel } from "@/lib/items";

type Props = {
  activeTab: "active" | "archived";
};

export function LocationFilterChips({ activeTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (activeTab !== "active") return null;

  const locationParam = searchParams.get("loc");
  const locationFilter = LOCATIONS.some((loc) => loc.value === locationParam)
    ? locationParam
    : "";

  const handleFilterChange = (loc?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (loc) {
      params.set("loc", loc);
    } else {
      params.delete("loc");
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { scroll: false });
  };

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <button
        type="button"
        onClick={() => handleFilterChange()}
        className={`rounded-full border px-4 py-1.5 font-medium transition ${
          locationFilter
            ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
            : "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
        }`}
      >
        Todos
      </button>
      {LOCATIONS.map((location) => {
        const isSelected = locationFilter === location.value;
        return (
          <button
            key={location.value}
            type="button"
            onClick={() => handleFilterChange(location.value)}
            className={`rounded-full border px-4 py-1.5 font-medium transition ${
              isSelected
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
            }`}
          >
            {formatLocationLabel(location.value)}
          </button>
        );
      })}
    </div>
  );
}
