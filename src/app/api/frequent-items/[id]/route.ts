import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FrequentItemInput, LocationType } from "@/lib/frequent-items";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<FrequentItemInput>;

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "O nome não pode estar vazio" },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.input_mode !== undefined) {
      if (!["date", "duration"].includes(body.input_mode)) {
        return NextResponse.json(
          { error: "Modo de input inválido" },
          { status: 400 }
        );
      }
      updateData.input_mode = body.input_mode;
    }

    if (body.default_duration_days !== undefined) {
      updateData.default_duration_days = body.default_duration_days;
    }

    if (body.allowed_locations !== undefined) {
      const validLocations: LocationType[] = ["fridge", "freezer", "pantry"];
      const allowedLocations = body.allowed_locations.filter((loc) =>
        validLocations.includes(loc)
      );

      if (allowedLocations.length === 0) {
        return NextResponse.json(
          { error: "Pelo menos uma localização é obrigatória" },
          { status: 400 }
        );
      }
      updateData.allowed_locations = allowedLocations;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from("frequent_items")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
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

    if (!item) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error("Error updating frequent item:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { error } = await supabase
      .from("frequent_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting frequent item:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
