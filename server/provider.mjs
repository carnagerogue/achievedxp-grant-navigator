import { AiError } from "./ai-errors.mjs";
// One provider boundary for every workflow: no prompt logging, no persistent provider storage.
export async function requestStructured(
  {
    instructions,
    input,
    schema,
    name = "doc_grant_analysis",
    maxOutput = 6000,
  },
  { apiKey, model, fetchImpl = fetch, timeoutMs = 60000 },
) {
  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: maxOutput,
        instructions,
        input: JSON.stringify(input),
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
    });
  } catch (error) {
    throw new AiError(
      503,
      error.name === "TimeoutError"
        ? "AI analysis timed out. Your plan is unchanged; try again."
        : "The AI provider could not be reached. Your plan is unchanged.",
    );
  }
  if (!response.ok)
    throw new AiError(
      response.status === 429 ? 429 : 503,
      response.status === 429
        ? "The AI provider is at its usage limit. Try again later."
        : [401, 403].includes(response.status)
          ? "The AI service credential was rejected by OpenAI. Your administrator needs to verify the server credential and its forwarding configuration. Your plan is unchanged."
          : "The AI provider could not complete the request. Your plan is unchanged.",
    );
  let payload;
  try {
    const raw = await response.text();
    if (raw.length > 200000) throw new Error();
    payload = JSON.parse(raw);
  } catch (_) {
    throw new AiError(
      502,
      "The AI provider returned an unreadable response. No draft was accepted.",
    );
  }
  if (payload.status !== "completed")
    throw new AiError(
      502,
      "The AI response was incomplete. No draft was accepted; try a shorter source excerpt.",
    );
  const content = (payload.output || [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content || []);
  if (content.some((c) => c.type === "refusal"))
    throw new AiError(
      422,
      "The AI provider could not analyze this request. Use the evidence brief and manual review instead.",
    );
  try {
    return JSON.parse(
      content
        .filter((c) => c.type === "output_text")
        .map((c) => c.text)
        .join(""),
    );
  } catch (_) {
    throw new AiError(
      502,
      "The AI response was not a structured review. No draft was accepted.",
    );
  }
}
export function rejectVendorPrices(value) {
  if (
    /(?:Nucleos|Achieve\s?DXP)[^.!?\n]{0,150}(?:\$\s*\d|\b\d[\d,.]*\s*(?:USD|dollars)\b)|(?:\$\s*\d|\b\d[\d,.]*\s*(?:USD|dollars)\b)[^.!?\n]{0,150}(?:Nucleos|Achieve\s?DXP)/i.test(
      JSON.stringify(value),
    )
  )
    throw new AiError(
      502,
      "The AI response included unsupported vendor pricing. No result was accepted.",
    );
}
