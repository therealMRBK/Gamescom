import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY ist nicht gesetzt. Bitte in der .env hinterlegen, um KI-Funktionen zu nutzen.",
    );
  }
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

async function ask(system: string, userPrompt: string, maxTokens = 1024): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Die KI hat die Anfrage abgelehnt.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Die KI hat keinen Text zurückgegeben.");
  }
  return textBlock.text.trim();
}

const CONTENT_FORMAT_HINTS: Record<string, string> = {
  HANDS_ON: "eine kurze Hands-on-Preview (ca. 150-250 Wörter) mit erstem Eindruck zum Gameplay",
  ARTIKEL: "einen Artikel-Einstieg (Lead-Absatz, ca. 100-150 Wörter), der zum Weiterlesen anregt",
  SOCIAL_LIVE: "einen kurzen, knackigen Social-Media-Post (max. 280 Zeichen, mit 2-3 passenden Hashtags)",
  REVIEW: "einen Einstiegsabsatz für eine Review (ca. 150 Wörter), noch ohne abschließende Wertung",
};

export async function generateContentDraft(input: {
  publisher: string;
  games: string[];
  format: string;
  appointmentTitle: string;
  hall?: string | null;
  notes?: string | null;
}): Promise<string> {
  const formatHint = CONTENT_FORMAT_HINTS[input.format] || "einen kurzen Entwurf";

  return ask(
    "Du bist Social-Media- und Redaktions-Assistent für ein deutschsprachiges Gaming-Medium, das von der gamescom 2026 in Köln berichtet. Du schreibst lebendige, konkrete Entwürfe auf Deutsch, ohne Floskeln oder generische KI-Phrasen. Gib ausschließlich den fertigen Text zurück, keine Erklärungen, keine Meta-Kommentare.",
    [
      `Schreibe ${formatHint} für folgenden Termin:`,
      `Publisher: ${input.publisher}`,
      `Spiel(e): ${input.games.join(", ") || "unbekannt"}`,
      `Termin: ${input.appointmentTitle}${input.hall ? ` (Halle ${input.hall})` : ""}`,
      input.notes ? `Notizen vom Team vor Ort: ${input.notes}` : null,
      "Da der Termin evtl. noch nicht stattgefunden hat, halte konkrete Spieleindrücke plausibel-generisch, aber ansprechend.",
    ]
      .filter(Boolean)
      .join("\n"),
    600,
  );
}

export async function generateOutreachEmail(input: {
  publisher: string;
  games: string[];
  contactPersonName?: string | null;
  contactChannel: string;
}): Promise<string> {
  return ask(
    "Du bist Social-Media-Manager einer deutschsprachigen Gaming-Redaktion und schreibst professionelle, freundliche Presseanfragen auf Deutsch für die gamescom 2026 in Köln. Gib ausschließlich den fertigen E-Mail-Text zurück (mit Betreffzeile), keine Erklärungen.",
    [
      `Schreibe eine kurze Presseanfrage-E-Mail an ${input.publisher}${input.contactPersonName ? ` (Ansprechpartner: ${input.contactPersonName})` : ""}.`,
      `Ziel: Ein Hands-on-/Interview-Termin während der gamescom 2026 (23.-30.08.2026, Köln) für unsere Redaktion.`,
      `Spiel(e), an denen wir interessiert sind: ${input.games.join(", ") || "das aktuelle Line-up"}.`,
      `Kontaktweg: ${input.contactChannel}.`,
      "Halte die E-Mail kurz (max. 150 Wörter), konkret und höflich, mit klarem Call-to-Action für einen Termin.",
    ].join("\n"),
    500,
  );
}

export async function generateDailyBriefing(input: {
  dayLabel: string;
  appointments: { time: string; title: string; publisher?: string | null }[];
  priorityPublishersWithoutAppointment: string[];
  conflictCount: number;
}): Promise<string> {
  const appointmentLines = input.appointments
    .map((a) => `- ${a.time} ${a.title}${a.publisher ? ` (${a.publisher})` : ""}`)
    .join("\n");

  return ask(
    "Du bist Redaktionsassistent für ein Gaming-Medium-Team auf der gamescom 2026. Du fasst den Tag in 3-4 klaren, direkten Sätzen auf Deutsch zusammen - wie ein kurzes Briefing zu Beginn eines Team-Meetings. Keine Floskeln, keine Überschriften, kein Aufzählungszeichen-Format, einfach Fließtext.",
    [
      `Tag: ${input.dayLabel}`,
      `Termine heute:\n${appointmentLines || "keine Termine geplant"}`,
      `Prioritäts-Publisher ohne Termin: ${input.priorityPublishersWithoutAppointment.join(", ") || "keine"}`,
      `Terminkonflikte/Pufferzeit-Warnungen: ${input.conflictCount}`,
      "Fasse das Wichtigste zusammen: was heute ansteht, worauf das Team achten sollte, und ob dringender Handlungsbedarf besteht.",
    ].join("\n"),
    400,
  );
}

export async function suggestPublisherPriority(input: {
  publisher: string;
  games: string[];
}): Promise<{ priority: "HOCH" | "MITTEL" | "NIEDRIG"; category: "AAA" | "SIMULATION" | "INDIE" | "SONSTIGE"; reasoning: string }> {
  const text = await ask(
    "Du bist Redaktions-Assistent für ein Gaming-Medium und bewertest Publisher/Spiele-Einträge für die gamescom-2026-Berichterstattung. Antworte AUSSCHLIESSLICH mit kompaktem JSON im Format {\"priority\": \"HOCH|MITTEL|NIEDRIG\", \"category\": \"AAA|SIMULATION|INDIE|SONSTIGE\", \"reasoning\": \"ein kurzer Satz auf Deutsch\"}. Kein Markdown, kein Codeblock, nur das reine JSON-Objekt.",
    `Publisher: ${input.publisher}\nSpiel(e): ${input.games.join(", ") || "unbekannt"}\n\nBewerte Priorität (AAA-Titel und Simulationen tendenziell hoch, Rest mittel/niedrig) und Kategorie.`,
    300,
  );

  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!["HOCH", "MITTEL", "NIEDRIG"].includes(parsed.priority)) {
    throw new Error("Ungültige Priorität von der KI erhalten.");
  }
  if (!["AAA", "SIMULATION", "INDIE", "SONSTIGE"].includes(parsed.category)) {
    throw new Error("Ungültige Kategorie von der KI erhalten.");
  }
  return parsed;
}
