import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface TrackUsageBody {
  name: string;
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

    const body = (await request.json()) as TrackUsageBody;

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "O nome é obrigatório" },
        { status: 400 }
      );
    }

    const normalizedName = body.name.trim();

    // Check if this item exists in frequent_items
    const { data: existingItem } = await supabase
      .from("frequent_items")
      .select("id, usage_count")
      .eq("user_id", user.id)
      .ilike("name", normalizedName)
      .maybeSingle();

    if (existingItem) {
      // Update usage count and last_used_at
      await supabase
        .from("frequent_items")
        .update({
          usage_count: existingItem.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);

      return NextResponse.json({ tracked: true });
    }

    return NextResponse.json({ tracked: false });
  } catch (err) {
    console.error("Error tracking usage:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
