import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getDefaultProductsForLocation,
  frequentItemToSuggestion,
  type LocationType,
  type ProductSuggestion,
} from "@/lib/frequent-items";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const location = (searchParams.get("location") ?? "fridge") as LocationType;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const suggestions: ProductSuggestion[] = [];

    // Fetch user's frequent items that match the query and location
    let dbQuery = supabase
      .from("frequent_items")
      .select("*")
      .eq("user_id", user.id)
      .contains("allowed_locations", [location])
      .order("usage_count", { ascending: false })
      .limit(5);

    if (query.length > 0) {
      dbQuery = dbQuery.ilike("name", `%${query}%`);
    }

    const { data: frequentItems } = await dbQuery;

    if (frequentItems) {
      suggestions.push(...frequentItems.map(frequentItemToSuggestion));
    }

    // Add default products if we have room
    if (suggestions.length < 5) {
      const defaultProducts = getDefaultProductsForLocation(location, query);
      const existingNames = new Set(
        suggestions.map((s) => s.name.toLowerCase())
      );

      for (const defaultProduct of defaultProducts) {
        if (suggestions.length >= 5) break;
        if (!existingNames.has(defaultProduct.name.toLowerCase())) {
          suggestions.push(defaultProduct);
        }
      }
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
  } catch (err) {
    console.error("Error fetching suggestions:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
