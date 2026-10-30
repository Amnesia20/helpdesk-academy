// Client for OpenAI-compatible chat APIs: Groq (free tier), Ollama, and similar.
// Free tiers have small per-model limits, so this rotates through a list of
// models when one is rate limited, and caps how many requests run at once.

export class CompatError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Models that rejected json_schema output; use plain JSON mode for them instead.
const noJsonSchema = new Set();

export function createCompatClient({ baseUrl, apiKey, provider, concurrency }) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const isGroq = provider === "groq";

  // ---- simple concurrency gate
  let active = 0;
  const waiting = [];
  async function acquire() {
    if (active < concurrency) {
      active++;
      return;
    }
    await new Promise((resolve) => waiting.push(resolve)); // slot is handed over directly
  }
  function release() {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }

  async function listModels() {
    const res = await fetch(`${baseUrl}/models`, { headers, signal: AbortSignal.timeout(15_000) });
    if (res.status === 401 || res.status === 403) throw new CompatError("rejected", res.status);
    if (!res.ok) throw new CompatError(`HTTP ${res.status}`, res.status);
    const data = await res.json();
    return (data.data || []).map((m) => m.id);
  }

  function effortFor(model, effort) {
    if (!isGroq || !effort) return {};
    const level = { low: "low", medium: "medium", high: "high", xhigh: "high", max: "high" }[effort];
    if (!level) return {};
    if (/gpt-oss/.test(model)) return { reasoning_effort: level, include_reasoning: false };
    if (/qwen/.test(model)) return { reasoning_effort: level, reasoning_format: "hidden" };
    return {};
  }

  // One request to one model. Returns {ok, value} or {ok:false, kind, ...}.
  // kind: "limit" (rate limited), "skip" (try another model), "fatal".
  async function request({ model, effort, system, messages, schema, maxTokens }) {
    const body = {
      model,
      messages: [{ role: "system", content: system }, ...messages],
      ...(isGroq ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
      ...effortFor(model, effort),
    };
    const useSchema = schema && !noJsonSchema.has(model);
    if (schema) body.response_format = useSchema ? { type: "json_schema", json_schema: { name: "response", strict: true, schema } } : { type: "json_object" };

    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000) });
    } catch (err) {
      console.error(`[ai] ${model}: network error:`, err.message);
      return { ok: false, kind: "skip" };
    }
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const choice = data.choices?.[0];
      if (choice?.finish_reason === "length") {
        console.warn(`[ai] ${model}: answer hit the token limit`);
        return { ok: false, kind: "skip" };
      }
      const text = String(choice?.message?.content || "")
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .trim();
      if (!schema) return text ? { ok: true, value: text } : { ok: false, kind: "skip" };
      const parsed = parseJson(text);
      if (!parsed) {
        console.warn(`[ai] ${model}: reply wasn't valid JSON`);
        return { ok: false, kind: "skip" };
      }
      return { ok: true, value: parsed };
    }

    const detail = data.error?.message || "";
    if (res.status === 429 || res.status === 413) {
      const retryAfter = Number(res.headers.get("retry-after"));
      console.warn(`[ai] ${model}: rate limited (${res.status})${retryAfter ? `, retry after ${retryAfter}s` : ""}`);
      return { ok: false, kind: "limit", retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null };
    }
    if (res.status === 400 && useSchema) {
      // This model may not support schema-constrained output; retry in JSON mode.
      console.warn(`[ai] ${model}: json_schema rejected, switching to JSON mode (${detail})`);
      noJsonSchema.add(model);
      return request({ model, effort, system, messages, schema, maxTokens });
    }
    if (res.status === 401 || res.status === 403) return { ok: false, kind: "fatal", error: new CompatError("The AI key isn't working. Let your instructor know.", 503) };
    console.error(`[ai] ${model}: HTTP ${res.status} ${detail}`);
    if (res.status === 404 || res.status === 400 || res.status >= 500) return { ok: false, kind: "skip" };
    return { ok: false, kind: "fatal", error: new CompatError("The AI service had a problem. Try again in a moment.", 502) };
  }

  async function complete({ models, effort, system, messages, schema, maxTokens }) {
    // In JSON mode the schema must be spelled out; it also helps in schema mode.
    const sys = schema ? `${system}\n\nReply with only one JSON object that matches this JSON Schema, and no other text:\n${JSON.stringify(schema)}` : system;
    await acquire();
    try {
      const limited = [];
      for (const model of models) {
        const r = await request({ model, effort, system: sys, messages, schema, maxTokens });
        if (r.ok) return r.value;
        if (r.kind === "fatal") throw r.error;
        if (r.kind === "limit") limited.push({ model, retryAfter: r.retryAfter });
      }
      // Every model failed. If one frees up in a few seconds, wait for it once.
      const soonest = limited.filter((l) => l.retryAfter != null).sort((a, b) => a.retryAfter - b.retryAfter)[0];
      if (soonest && soonest.retryAfter <= 12) {
        await sleep(soonest.retryAfter * 1000 + 300);
        const r = await request({ model: soonest.model, effort, system: sys, messages, schema, maxTokens });
        if (r.ok) return r.value;
        if (r.kind === "fatal") throw r.error;
      }
      if (limited.length) {
        const wait = soonest?.retryAfter;
        if (wait && wait > 600) {
          const mins = Math.ceil(wait / 60);
          throw new CompatError(`The free AI has hit its daily limit. Capacity comes back gradually; try again in about ${mins >= 90 ? Math.round(mins / 60) + " hours" : mins + " minutes"}.`, 429);
        }
        throw new CompatError(`The free AI is at its per-minute limit. Wait ${wait ? Math.ceil(wait) + " seconds" : "a minute"} and send again.`, 429);
      }
      throw new CompatError("The AI couldn't produce an answer. Try again in a moment.", 502);
    } finally {
      release();
    }
  }

  return { listModels, complete };
}

function parseJson(text) {
  const attempts = [text, text.replace(/^```(?:json)?\s*|\s*```$/g, "")];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) attempts.push(text.slice(start, end + 1));
  for (const t of attempts) {
    try {
      const v = JSON.parse(t);
      if (v && typeof v === "object" && !Array.isArray(v)) return v;
    } catch {}
  }
  return null;
}
