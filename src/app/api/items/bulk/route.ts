import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const LOCATION_VALUES = ["fridge", "freezer", "pantry"] as const;

type IncomingItem = {
  name?: string | null;
  location?: string | null;
  expires_at?: string | null;
};

function capitalizeName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as { items?: IncomingItem[] };
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Não há itens para adicionar" },
        { status: 400 }
      );
    }

    const normalized = items.map((item) => {
      const name = capitalizeName(item.name?.toString() ?? "");
      const expires_at = item.expires_at?.toString().trim() ?? "";
      const location = item.location?.toString().trim().toLowerCase() ?? "fridge";

      return {
        name,
        expires_at,
        location,
      };
    });

    const invalid = normalized.some(
      (item) =>
        !item.name ||
        !item.expires_at ||
        !isValidDate(item.expires_at) ||
        !LOCATION_VALUES.includes(item.location as (typeof LOCATION_VALUES)[number])
    );

    if (invalid) {
      return NextResponse.json(
        { error: "Existem itens inválidos" },
        { status: 400 }
      );
    }

    const payload = normalized.map((item) => ({
      name: item.name,
      expires_at: item.expires_at,
      location: item.location,
      status: "active",
      user_id: user.id,
    }));

    const { error } = await supabase.from("items").insert(payload);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: payload.length });
  } catch (err) {
    console.error("Erro ao adicionar itens:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
