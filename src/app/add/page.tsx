import Link from "next/link";
import { redirect } from "next/navigation";
import type { AddItemState } from "./types";
import { AddItemForm } from "./add-form";
import { LOCATIONS, LOCATION_LABELS } from "@/lib/items";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function addItemAction(
  _prevState: AddItemState,
  formData: FormData,
): Promise<AddItemState> {
  "use server";

  const name = formData.get("name")?.toString().trim();
  const expiresAt = formData.get("expires_at")?.toString();
  const location = formData.get("location")?.toString();

  if (!name || !expiresAt || !location) {
    return { error: "Preenche todos os campos." };
  }

  const allowedLocations = LOCATIONS.map((loc) => loc.value);
  if (!allowedLocations.includes(location)) {
    return { error: "Local inválido." };
  }

  const supabase = createServerSupabaseClient();
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
    status: "active",
    user_id: user.id,
  });

  if (error) {
    return { error: "Não foi possível guardar o item." };
  }

  redirect("/items");
}

type Props = {
  searchParams?: {
    loc?: string;
  };
};

export default async function AddPage({ searchParams }: Props) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locationParam = searchParams?.loc;
  const defaultLocation =
    locationParam && LOCATIONS.some((loc) => loc.value === locationParam)
      ? locationParam
      : "fridge";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <Link href="/items" className="text-sm text-slate-500 underline">
          ← Voltar aos itens
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">
          Adicionar item
        </h1>
        <p className="text-sm text-slate-600">
          Escolhe o local e a data exata para receberes alertas no momento
          certo.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <AddItemForm action={addItemAction} defaultLocation={defaultLocation} />
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Sugestões rápidas</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {LOCATIONS.map((loc) => (
            <li key={loc.value}>
              Usa{" "}
              <code className="rounded bg-slate-100 px-2 py-1 text-xs">
                /add?loc={loc.value}
              </code>{" "}
              para pré-selecionar {LOCATION_LABELS[loc.value]}.
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
