import { NextResponse } from "next/server";

const LOCATION_VALUES = ["fridge", "freezer", "pantry"] as const;

function normalizeLocation(value: string | null | undefined) {
  if (!value) return "fridge";
  const lower = value.toLowerCase();
  if (LOCATION_VALUES.includes(lower as (typeof LOCATION_VALUES)[number])) {
    return lower;
  }
  return "fridge";
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Ficheiro de áudio em falta." },
        { status: 400 }
      );
    }

    const audioForm = new FormData();
    audioForm.append("file", file);
    audioForm.append("model", "whisper-1");
    audioForm.append("language", "pt");

    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: audioForm,
      }
    );

    const transcriptionData = await transcriptionResponse.json();

    if (!transcriptionResponse.ok) {
      return NextResponse.json(
        { error: transcriptionData.error?.message ?? "Erro na transcrição." },
        { status: 500 }
      );
    }

    const transcript = transcriptionData.text?.trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "Não foi possível transcrever o áudio." },
        { status: 500 }
      );
    }

    const today = new Date();
    const todayIso = today.toISOString().split("T")[0];

    const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";

    const completionResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Extrai itens alimentares de uma nota em PT-PT. Responde APENAS com JSON válido. Não inventes dados. Usa localização default 'fridge' quando não indicado. Para validade: devolve expires_at em formato YYYY-MM-DD. Se o texto falar em 'dura X dias', calcula a data com base na data de hoje fornecida. Se a data mencionada já passou este ano, usa o próximo ano.",
            },
            {
              role: "user",
              content: `Hoje é ${todayIso} (Europa/Lisboa). Texto: """${transcript}""". Devolve {"items":[{"name":"","expires_at":"YYYY-MM-DD","location":"fridge|freezer|pantry"}]}`,
            },
          ],
        }),
      }
    );

    const completionData = await completionResponse.json();

    if (!completionResponse.ok) {
      return NextResponse.json(
        { error: completionData.error?.message ?? "Erro ao extrair itens." },
        { status: 500 }
      );
    }

    const content = completionData.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Resposta inválida do modelo." },
        { status: 500 }
      );
    }

    let parsed: { items?: Array<{ name?: string; expires_at?: string; location?: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Resposta inválida do modelo." },
        { status: 500 }
      );
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const normalizedItems = items.map((item) => ({
      name: item.name?.toString().trim() ?? "",
      expires_at: normalizeDate(item.expires_at),
      location: normalizeLocation(item.location),
    }));

    return NextResponse.json({ transcript, items: normalizedItems });
  } catch (err) {
    console.error("Erro ao processar áudio:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
