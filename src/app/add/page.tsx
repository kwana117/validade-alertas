import Link from "next/link";
import { redirect } from "next/navigation";
import type { AddItemState } from "./types";
import { AddItemForm } from "./add-form";
import { LOCATIONS, formatLocationLabel, type CategoryType } from "@/lib/items";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LocationValue = (typeof LOCATIONS)[number]["value"];

function isLocationValue(value: string): value is LocationValue {
  return LOCATIONS.some((loc) => loc.value === value);
}

async function addItemAction(
  _prevState: AddItemState,
  formData: FormData,
): Promise<AddItemState> {
  "use server";

  const name = formData.get("name")?.toString().trim();
  const expiresAt = formData.get("expires_at")?.toString();
  const location = formData.get("location")?.toString();
  const category = (formData.get("category")?.toString() ?? "alimentar") as CategoryType;

  if (!name || !expiresAt || !location) {
    return { error: "Preenche todos os campos." };
  }

  const validCategories: CategoryType[] = ["alimentar", "saude"];
  if (!validCategories.includes(category)) {
    return { error: "Categoria inválida." };
  }

  if (category === "alimentar" && !isLocationValue(location)) {
    return { error: "Local inválido." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("items").insert({
    name,
    expires_at: expiresAt,
    location,
    category,
    status: "active",
    user_id: user.id,
  });

  if (error) {
    return { error: "Não foi possível guardar o item." };
  }

  redirect("/items");
}

type Props = {
  searchParams?: Promise<{
    loc?: string;
  }>;
};

export default async function AddPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const locationParam = resolvedSearchParams?.loc;
  const defaultLocation =
    locationParam && LOCATIONS.some((loc) => loc.value === locationParam)
      ? locationParam
      : "fridge";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/items"
          className="text-sm text-slate-500 underline dark:text-slate-400"
        >
          ← Voltar aos itens
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Adicionar item
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Escolhe o local e a data exata para receberes alertas no momento
          certo.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <AddItemForm action={addItemAction} defaultLocation={defaultLocation} />
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          Sugestões rápidas
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {LOCATIONS.map((loc) => (
            <li key={loc.value}>
              Usa{" "}
              <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                /add?loc={loc.value}
              </code>{" "}
              para pré-selecionar {formatLocationLabel(loc.value)}.
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
