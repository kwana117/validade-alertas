import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FrequentItemInput, LocationType } from "@/lib/frequent-items";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: items, error } = await supabase
      .from("frequent_items")
      .select("*")
      .eq("user_id", user.id)
      .order("usage_count", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items ?? [] });
  } catch (err) {
    console.error("Error fetching frequent items:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
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

    const body = (await request.json()) as FrequentItemInput;

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "O nome é obrigatório" },
        { status: 400 }
      );
    }

    if (!["date", "duration"].includes(body.input_mode)) {
      return NextResponse.json(
        { error: "Modo de input inválido" },
        { status: 400 }
      );
    }

    if (body.input_mode === "duration" && !body.default_duration_days) {
      return NextResponse.json(
        { error: "Duração padrão é obrigatória para modo 'duration'" },
        { status: 400 }
      );
    }

    const validLocations: LocationType[] = ["fridge", "freezer", "pantry"];
    const allowedLocations = (body.allowed_locations ?? []).filter((loc) =>
      validLocations.includes(loc)
    );

    if (allowedLocations.length === 0) {
      return NextResponse.json(
        { error: "Pelo menos uma localização é obrigatória" },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from("frequent_items")
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        input_mode: body.input_mode,
        default_duration_days:
          body.input_mode === "duration" ? body.default_duration_days : null,
        allowed_locations: allowedLocations,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um produto com este nome" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Error creating frequent item:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
