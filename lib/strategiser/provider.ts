import "server-only";

/**
 * The one place a language model is called.
 *
 * Everything about the provider — base URL, auth header, request shape — is
 * behind this function, so moving to Groq or to a billed key is an edit here
 * and nowhere else. Keys are read from the environment on the server and are
 * never returned, logged, or sent to the browser.
 */

/**
 * Tried in order.
 *
 * The brief asked for the moving alias, and it is first because staying
 * current is worth something. It is not alone because it is an alias: on the
 * day this was written it answered 503 "high demand" while a pinned id served
 * fine, and a strategiser that stops working because Google is busy is not
 * worth shipping. Failing over costs one extra round trip in the rare case.
 */
const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
] as const;

const modelUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const TIMEOUT_MS = 20_000;
const RETRIES = 1;

export class ModelUnavailable extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ModelUnavailable";
  }
}

export function modelConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type JsonSchema = Record<string, unknown>;

async function callGemini(
  model: string,
  prompt: string,
  schema: JsonSchema,
  temperature: number,
  signal: AbortSignal,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ModelUnavailable("GEMINI_API_KEY is not set");

  const response = await fetch(modelUrl(model), {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "X-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature,
      },
    }),
  });

  // 429 and 503 are both "come back later"; 404 means this id is gone. All
  // three are worth trying the next model for.
  if ([429, 503, 404].includes(response.status)) {
    throw new ModelUnavailable(`retryable http ${response.status}`);
  }
  if (!response.ok) throw new ModelUnavailable(`http ${response.status}`);

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new ModelUnavailable("no text in response");
  return text;
}

/**
 * Ask for one JSON object matching `schema`.
 *
 * Retries on the transient failures — a rate limit or a timeout — with a
 * widening pause, then gives up. Giving up is not an error state for the
 * caller: the pipeline falls back to a plain database ranking, because a
 * shortlist without commentary beats an empty screen.
 */
export async function generateJson<T>(options: {
  prompt: string;
  schema: JsonSchema;
  temperature: number;
}): Promise<T> {
  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const text = await callGemini(
          model,
          options.prompt,
          options.schema,
          options.temperature,
          controller.signal,
        );
        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error;
        // A malformed body will not fix itself; only transport problems retry.
        if (error instanceof SyntaxError) break;
        if (attempt < RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
        }
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw new ModelUnavailable(
    lastError instanceof Error ? lastError.message : "unknown model failure",
  );
}
