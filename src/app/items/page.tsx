import { differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LOCATIONS, STATUS_CLASSES, STATUS_LABELS, formatLocationLabel } from "@/lib/items";
import { DeleteItemForm } from "@/app/items/delete-item-form";
import { EditItemName } from "@/app/items/edit-item-name";
import { LocationFilterChips } from "@/app/items/location-filters";
import { StickyFilterBar } from "@/app/items/sticky-filter-bar";
import { TestItemButton } from "@/app/items/test-item-button";

export const dynamic = "force-dynamic";

type PantryItem = {
  id: string;
  name: string;
  expires_at: string;
  location: string;
  status: string;
  updated_at?: string | null;
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

async function deleteItemAction(formData: FormData) {
  "use server";

  const itemId = formData.get("itemId")?.toString();
  if (!itemId) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  revalidatePath("/items");
}

async function updateItemName(formData: FormData) {
  "use server";

  const itemId = formData.get("itemId")?.toString();
  const name = formData.get("name")?.toString().trim();

  if (!itemId || !name) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("items")
    .update({ name })
    .eq("id", itemId)
    .eq("user_id", user.id)
    .eq("status", "active");

  revalidatePath("/items");
}

type Props = {
  searchParams?: Promise<{
    tab?: string;
    loc?: string;
  }>;
};

export default async function ItemsPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const activeTab =
    resolvedSearchParams?.tab === "archived" ? "archived" : "active";
  const locationParam = resolvedSearchParams?.loc;
  const locationFilter = LOCATIONS.some((loc) => loc.value === locationParam)
    ? locationParam
    : "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("enable_item_test_button")
    .eq("id", user.id)
    .maybeSingle();

  const enableItemTestButton = profile?.enable_item_test_button ?? false;

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
  const filteredActiveItems = locationFilter
    ? activeItems.filter((item) => item.location === locationFilter)
    : activeItems;
  const archivedItems = itemsList
    .filter((item) => item.status !== "active")
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.updated_at ?? a.expires_at).getTime();
      const bDate = new Date(b.updated_at ?? b.expires_at).getTime();
      return bDate - aDate;
    });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Resumo diário
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Tens {activeItems.length} itens ativos
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Mantém os dados atualizados para receber alertas certeiros.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {LOCATIONS.map((location) => (
              <Link
                key={location.value}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                href={`/add?loc=${location.value}`}
              >
                + {formatLocationLabel(location.value)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {itemsList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Ainda não existe nada registado. Adiciona o primeiro item. 👇
        </div>
      ) : (
        <section className="space-y-6">
          <header className="flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Itens por ordem de validade
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Recebes alertas aos 3 dias, 1 dia, no próprio dia e após expirar.
              </p>
            </div>
            <div className="inline-flex w-fit flex-wrap items-center gap-2 self-start rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Link
                href={locationFilter ? `/items?loc=${locationFilter}` : "/items"}
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === "active"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                Ativos ({activeItems.length})
              </Link>
              <Link
                href="/items?tab=archived"
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === "archived"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                Arquivados ({archivedItems.length})
              </Link>
            </div>
            {activeTab === "active" && locationFilter ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                A mostrar {filteredActiveItems.length} de {activeItems.length} itens
                ativos em {formatLocationLabel(locationFilter)}.
              </p>
            ) : null}
          </header>
          <StickyFilterBar>
            <LocationFilterChips activeTab={activeTab} />
          </StickyFilterBar>

          {activeTab === "archived" ? (
            archivedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Ainda não tens itens arquivados.
              </div>
            ) : (
              <div className="space-y-4">
                {archivedItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {formatLocationLabel(item.location)}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </h3>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          <p>
                            Validade: {DATE_FORMATTER.format(new Date(item.expires_at))}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 md:items-end">
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            STATUS_CLASSES[item.status] ??
                            "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <form action={updateItemStatus}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="status" value="active" />
                            <button
                              type="submit"
                              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                              Restaurar
                            </button>
                          </form>
                          {enableItemTestButton ? (
                            <TestItemButton itemId={item.id} />
                          ) : null}
                          <DeleteItemForm
                            itemId={item.id}
                            action={deleteItemAction}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : filteredActiveItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {locationFilter
                ? `Nenhum item ativo em ${formatLocationLabel(locationFilter)}.`
                : "Nenhum item ativo neste momento."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActiveItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {formatLocationLabel(item.location)}
                      </p>
                      <EditItemName
                        itemId={item.id}
                        name={item.name}
                        action={updateItemName}
                      />
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        <p>
                          Validade: {DATE_FORMATTER.format(new Date(item.expires_at))}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {daysUntil(item.expires_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 md:items-end">
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_CLASSES[item.status] ??
                          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <form action={updateItemStatus}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="status" value="consumed" />
                          <button
                            type="submit"
                            className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            Marcar consumido
                          </button>
                        </form>
                        <form action={updateItemStatus}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="status" value="discarded" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-3 py-1 font-medium text-amber-700 transition hover:border-amber-400 hover:text-amber-900 dark:border-amber-400/50 dark:text-amber-200 dark:hover:border-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-100"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="9" />
                              <path d="M5 5l14 14" />
                            </svg>
                            Marcar descartado
                          </button>
                        </form>
                        {enableItemTestButton ? (
                          <TestItemButton itemId={item.id} />
                        ) : null}
                        <DeleteItemForm itemId={item.id} action={deleteItemAction} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
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
