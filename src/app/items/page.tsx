import { differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  LOCATION_LABELS,
  LOCATIONS,
  STATUS_CLASSES,
  STATUS_LABELS,
} from "@/lib/items";

export const dynamic = "force-dynamic";

type PantryItem = {
  id: string;
  name: string;
  expires_at: string;
  location: string;
  status: string;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

async function updateItemStatus(formData: FormData) {
  "use server";

  const itemId = formData.get("itemId")?.toString();
  const newStatus = formData.get("status")?.toString();

  if (!itemId || !newStatus) return;

  const allowed = ["active", "consumed", "discarded"];
  if (!allowed.includes(newStatus)) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("items")
    .update({ status: newStatus })
    .eq("id", itemId)
    .eq("user_id", user.id);

  revalidatePath("/items");
}

export default async function ItemsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os itens.");
  }

  const itemsList = (items as PantryItem[] | null) ?? [];
  const activeItems = itemsList.filter((item) => item.status === "active");
  const otherItems = itemsList.filter((item) => item.status !== "active");

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-slate-500">
              Resumo diário
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Tens {activeItems.length} itens ativos
            </h1>
            <p className="text-sm text-slate-600">
              Mantém os dados atualizados para receber alertas certeiros.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {LOCATIONS.map((location) => (
              <Link
                key={location.value}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                href={`/add?loc=${location.value}`}
              >
                + {location.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Itens por ordem de validade
          </h2>
          <p className="text-sm text-slate-600">
            Recebes alertas aos 3 dias, 1 dia, no próprio dia e após expirar.
          </p>
        </header>

        {itemsList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            Ainda não existe nada registado. Adiciona o primeiro item. 👇
          </div>
        ) : (
          <div className="space-y-4">
            {[...activeItems, ...otherItems].map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-500">
                      {LOCATION_LABELS[item.location] ?? "Local"}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {item.name}
                    </h3>
                    <div className="mt-1 text-sm text-slate-600">
                      <p>Validade: {DATE_FORMATTER.format(new Date(item.expires_at))}</p>
                      {item.status === "active" ? (
                        <p className="text-slate-500">
                          {daysUntil(item.expires_at)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:items-end">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[item.status] ?? "bg-slate-100 text-slate-800"}`}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    {item.status === "active" ? (
                      <div className="flex flex-wrap gap-2 text-sm">
                        <form action={updateItemStatus}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="status" value="consumed" />
                          <button
                            type="submit"
                            className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                          >
                            Marcar consumido
                          </button>
                        </form>
                        <form action={updateItemStatus}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="status" value="discarded" />
                          <button
                            type="submit"
                            className="rounded-full border border-rose-200 px-3 py-1 font-medium text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
                          >
                            Marcar descartado
                          </button>
                        </form>
                      </div>
                    ) : (
                      <form action={updateItemStatus}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="status" value="active" />
                        <button
                          type="submit"
                          className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                        >
                          Reativar
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function daysUntil(expiresAt: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  const diff = differenceInCalendarDays(expiry, today);

  if (diff < 0) return "Já expirou 🚨";
  if (diff === 0) return "Expira hoje";
  if (diff === 1) return "Expira amanhã";
  return `Faltam ${diff} dias`;
}
