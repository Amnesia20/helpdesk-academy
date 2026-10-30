// The three AI roles (caller, mentor, grader). Works with Claude, or with an
// OpenAI-compatible service such as Groq's free tier. Without a working AI the
// app runs in demo mode: placeholder caller replies, static hints, and a
// checklist-based grade, so the instructor can try the interface first.
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { createCompatClient, CompatError } from "./openai-compat.js";
import {
  CALLER_SCHEMA,
  GRADER_SCHEMA,
  CATEGORY_MAX,
  callerSystem,
  callerMessages,
  callerState,
  mentorSystem,
  mentorUser,
  graderSystem,
  graderUser,
} from "./prompts.js";

// Claude models that accept server-side refusal fallbacks (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);
// Claude models that accept a system message in the middle of `messages`.
const MIDCONV_SYSTEM_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-opus-4-8", "claude-fable-5", "claude-fable-5-1", "claude-sonnet-5-5", "claude-haiku-5-5"]);

const isClaude = () => config.aiProvider === "anthropic";
const PROVIDER_NAME = { anthropic: "Claude", groq: "Groq", openai: /:11434\b/.test(config.aiBaseUrl) ? "Ollama" : "OpenAI-compatible server" };

// Token budgets. Free tiers count tokens per minute, so keep those tight.
const MAX_TOKENS = isClaude() ? { caller: 8000, mentor: 6000, grader: 16000 } : { caller: 1500, mentor: 1200, grader: 3000 };

export const ai = { mode: "demo", reason: "", provider: config.aiProvider, providerName: PROVIDER_NAME[config.aiProvider] || config.aiProvider };
let claude = null;
let compat = null;

export class AIError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// The desktop app fixes problems in its Settings window, not in .env.
const DESKTOP = process.env.HDA_DESKTOP === "1";
const fix = (problem, webHowTo) => `${problem} ${DESKTOP ? "Open HelpDesk Academy > Settings to fix it." : webHowTo}`;

function demo(reason) {
  ai.mode = "demo";
  ai.reason = reason;
}

export async function initAI() {
  if (config.forceDemo) return demo("Demo mode was requested at startup.");
  if (isClaude()) return initClaude();
  return initCompat();
}

async function initClaude() {
  try {
    claude = new Anthropic({ timeout: 90_000, maxRetries: 2 });
    await claude.models.list({ limit: 1 });
    ai.mode = "live";
    ai.reason = "";
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) demo(fix("The Claude key was rejected.", "Check ANTHROPIC_API_KEY in .env."));
    else if (err instanceof Anthropic.APIConnectionError) demo("Couldn't reach the Anthropic API. Check this computer's internet connection.");
    else if (err instanceof Anthropic.APIError) demo(`The Anthropic API check failed (${err.status ?? ""} ${err.message}).`);
    // Not an API response at all: the SDK found no credentials to send.
    else demo(fix("No AI service is set up yet.", "Add ANTHROPIC_API_KEY (Claude) or GROQ_API_KEY (free Groq) to the .env file and restart."));
  }
}

async function initCompat() {
  const label = ai.providerName;
  if (!config.aiBaseUrl) return demo(fix("The AI server address is missing.", "Set AI_BASE_URL in .env."));
  if (config.aiProvider === "groq" && !config.aiApiKey) return demo(fix("No Groq key is saved.", "Add GROQ_API_KEY to the .env file and restart."));
  if (!config.callerModels.length) return demo(fix("No AI model is chosen.", "Set CALLER_MODEL in .env."));
  compat = createCompatClient({ baseUrl: config.aiBaseUrl, apiKey: config.aiApiKey, provider: config.aiProvider, concurrency: config.aiConcurrency });
  let available;
  try {
    available = new Set(await compat.listModels());
  } catch (err) {
    if (err instanceof CompatError && (err.status === 401 || err.status === 403)) return demo(fix(`The ${label} key was rejected.`, "Check it in .env."));
    if (err instanceof CompatError) return demo(`The ${label} API check failed (${err.message}).`);
    if (config.aiProvider === "openai") return demo(`Couldn't reach ${label} at ${config.aiBaseUrl}. Make sure ${label === "Ollama" ? "Ollama is installed and running" : "that server is running"}.`);
    return demo(`Couldn't reach ${label}. Check the internet connection.`);
  }
  // Drop models the service doesn't offer (free models get retired often).
  for (const key of ["callerModels", "graderModels"]) {
    const missing = config[key].filter((m) => !available.has(m));
    if (missing.length) console.warn(`[ai] ${label} doesn't offer ${missing.join(", ")}; skipping ${missing.length > 1 ? "them" : "it"}.`);
    config[key] = config[key].filter((m) => available.has(m));
  }
  if (!config.callerModels.length) return demo(fix(`None of the chosen AI models are available on ${label}.`, "Check CALLER_MODEL in .env."));
  if (!config.graderModels.length) config.graderModels = [...config.callerModels];
  ai.mode = "live";
  ai.reason = "";
}

// ------------------------------------------------------------------ claude --
function friendlyClaude(err) {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new AIError("The AI key isn't working. Let your instructor know.", 503);
  if (err instanceof Anthropic.PermissionDeniedError) return new AIError("This API key can't use the configured model. Let your instructor know.", 503);
  if (err instanceof Anthropic.NotFoundError) return new AIError("The configured AI model wasn't found. Let your instructor know.", 503);
  if (err instanceof Anthropic.RateLimitError) return new AIError("The AI is busy right now. Wait a few seconds and try again.", 429);
  if (err instanceof Anthropic.BadRequestError) {
    console.error("[ai] bad request:", err.message);
    return new AIError("The AI couldn't process that request. Try again; if it keeps happening, tell your instructor.", 502);
  }
  if (err instanceof Anthropic.APIConnectionError) return new AIError("Couldn't reach the AI service. Check the server's internet connection.", 503);
  if (err instanceof Anthropic.APIError) {
    console.error("[ai] API error:", err.status, err.message);
    return new AIError("The AI service had a problem. Try again in a moment.", 502);
  }
  console.error("[ai] unexpected error:", err);
  return new AIError("Something went wrong talking to the AI. Try again.", 500);
}

async function callClaude({ model, effort, system, messages, schema, maxTokens }) {
  const output_config = {};
  if (effort) output_config.effort = effort;
  if (schema) output_config.format = { type: "json_schema", schema };
  const params = { model, max_tokens: maxTokens, system, messages };
  if (Object.keys(output_config).length) params.output_config = output_config;

  let res;
  try {
    res = FALLBACK_MODELS.has(model)
      ? await claude.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await claude.messages.create(params);
  } catch (err) {
    throw friendlyClaude(err);
  }
  if (res.stop_reason === "refusal") throw new AIError("The AI declined to answer that. Try rephrasing your message.", 422);
  if (res.stop_reason === "max_tokens") throw new AIError("The AI's answer was cut off. Try again.", 502);
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!schema) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new AIError("The AI returned something unreadable. Try again.", 502);
  }
}

// One entry point for both services. `models` is a list; Claude uses the first.
async function callModel({ models, effort, system, messages, schema, maxTokens }) {
  if (isClaude()) return callClaude({ model: models[0], effort, system, messages, schema, maxTokens });
  try {
    return await compat.complete({ models, effort, system, messages, schema, maxTokens });
  } catch (err) {
    if (err instanceof CompatError) throw new AIError(err.message, err.status);
    console.error("[ai] unexpected error:", err);
    throw new AIError("Something went wrong talking to the AI. Try again.", 500);
  }
}

// ---------------------------------------------------------------- caller ----
export async function callerReply(lab, attempt) {
  if (ai.mode !== "live") return demoCaller(lab, attempt);
  const messages = callerMessages(lab, attempt);
  const state = callerState(lab, attempt);
  // The per-turn state goes last, after the stable history, so the history can be cached.
  if (!isClaude() || MIDCONV_SYSTEM_MODELS.has(config.callerModels[0])) {
    messages.push({ role: "system", content: state });
  } else {
    const last = messages.at(-1);
    last.content = `${last.content}\n\n<current_situation>\n${state}\n</current_situation>`;
  }
  const out = await callModel({
    models: config.callerModels,
    effort: config.callerEffort,
    system: callerSystem(lab),
    messages,
    schema: CALLER_SCHEMA,
    maxTokens: MAX_TOKENS.caller,
  });
  const text = typeof out.reply === "string" ? out.reply.trim() : "";
  if (!text) throw new AIError("The caller's reply came back empty. Send your message again.", 502);
  return {
    text,
    resolved: out.issue_resolved === true,
    frustration: Math.min(5, Math.max(1, Math.round(Number(out.frustration) || 2))),
    ended: out.call_ended === true,
  };
}

function demoCaller(lab, attempt) {
  const turns = attempt.timeline.filter((e) => e.type === "student").length;
  const said = attempt.timeline.filter((e) => e.type === "student").at(-1)?.text || "";
  const bye = /\b(bye|goodbye|have a (good|great|nice) day)\b/i.test(said);
  const first = lab.caller.name.split(" ")[0];
  const text = bye
    ? `Thanks, bye! (Demo mode: ${first} would end the call here.)`
    : turns === 1
      ? `[Demo mode: the AI caller is off] Hi, this is ${first}. In live mode I'd answer you in character, react to what you do in the Admin Center, and only reveal clues when you ask the right questions. Ask your instructor to add an AI key to turn me on.`
      : `[Demo mode] ${first} would answer: "${said.slice(0, 120)}${said.length > 120 ? "..." : ""}" here.`;
  return { text, resolved: false, frustration: 2, ended: bye };
}

// ---------------------------------------------------------------- mentor ----
export async function mentorReply(lab, attempt, question, hintNumber) {
  if (ai.mode !== "live") {
    const h = lab.hints[Math.min(hintNumber, lab.hints.length) - 1];
    return `${h}${question ? "\n\n(Demo mode: in live mode I'd answer your specific question too.)" : ""}`;
  }
  const text = await callModel({
    models: config.callerModels,
    effort: config.callerEffort,
    system: mentorSystem(lab),
    messages: [{ role: "user", content: mentorUser(lab, attempt, question, hintNumber) }],
    maxTokens: MAX_TOKENS.mentor,
  });
  if (!text) throw new AIError("Sam didn't come back with an answer. Try again.", 502);
  return tidyParagraphs(text);
}

// Some models glue two paragraphs together with no space ("format.Next, ...").
// Put the space back after a sentence end that runs straight into a new word.
export const tidyParagraphs = (text) => text.replace(/([a-z][.!?])(?=[A-Z][a-z])/g, "$1 ");

// ---------------------------------------------------------------- grader ----
export async function gradeAttempt(lab, attempt, checks) {
  let raw;
  if (ai.mode === "live") {
    raw = await callModel({
      models: config.graderModels,
      effort: config.graderEffort,
      system: graderSystem(),
      messages: [{ role: "user", content: graderUser(lab, attempt, checks) }],
      schema: GRADER_SCHEMA,
      maxTokens: MAX_TOKENS.grader,
    });
  } else {
    raw = demoGrade(lab, attempt, checks);
  }
  return finalizeGrade(raw, attempt, checks);
}

const strings = (v) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : []);

function finalizeGrade(raw, attempt, checks) {
  const scores = {};
  for (const [k, max] of Object.entries(CATEGORY_MAX)) scores[k] = Math.min(max, Math.max(0, Math.round(Number(raw.scores?.[k]) || 0)));
  const critical = strings(raw.critical_failures);
  let total = Object.values(scores).reduce((a, b) => a + b, 0);
  const capped = critical.length > 0 && total > 40;
  if (capped) total = 40;
  const hintPenalty = Math.min(15, attempt.hintsUsed * config.hintPenalty);
  const final = Math.max(0, total - hintPenalty);
  const verdict = final >= 90 ? "Exceeds expectations" : final >= 75 ? "Meets expectations" : final >= 55 ? "Developing" : "Needs work";
  const notes = raw.category_notes && typeof raw.category_notes === "object" ? raw.category_notes : {};
  return {
    scores,
    max: CATEGORY_MAX,
    categoryNotes: Object.fromEntries(Object.keys(CATEGORY_MAX).map((k) => [k, String(notes[k] || "")])),
    criticalFailures: critical,
    strengths: strings(raw.strengths),
    improvements: strings(raw.improvements),
    expertComparison: String(raw.expert_comparison || ""),
    summary: String(raw.summary || ""),
    checks,
    rawTotal: total,
    capped,
    hintPenalty,
    total: final,
    verdict,
    demo: ai.mode !== "live",
    gradedBy: ai.mode === "live" ? ai.providerName : "demo",
    gradedAt: new Date().toISOString(),
  };
}

function demoGrade(lab, attempt, checks) {
  const ratio = checks.length ? checks.filter((c) => c.passed).length / checks.length : 0.5;
  const talked = attempt.timeline.filter((e) => e.type === "student").length;
  const effort = Math.min(1, talked / 6);
  const s = (max, f) => Math.round(max * f);
  const notes = attempt.closure.resolution.length;
  return {
    scores: {
      troubleshooting: s(CATEGORY_MAX.troubleshooting, 0.3 + 0.4 * effort + 0.3 * ratio),
      resolution: s(CATEGORY_MAX.resolution, 0.2 + 0.8 * ratio),
      security: s(CATEGORY_MAX.security, 0.4 + 0.6 * ratio),
      communication: s(CATEGORY_MAX.communication, 0.4 + 0.6 * effort),
      documentation: s(CATEGORY_MAX.documentation, notes > 200 ? 0.9 : notes > 80 ? 0.65 : 0.35),
    },
    category_notes: Object.fromEntries(Object.keys(CATEGORY_MAX).map((k) => [k, "Demo mode estimate from the objective checks. Turn on the AI for real feedback."])),
    critical_failures: [],
    strengths: checks.filter((c) => c.passed).map((c) => c.label).slice(0, 4),
    improvements: [...checks.filter((c) => !c.passed).map((c) => c.label), "Demo mode: this grade only reflects the objective checks, not your conversation."].slice(0, 4),
    expert_comparison: lab.expert,
    summary: "This is a demo-mode estimate. With the AI turned on, an AI team lead reviews your whole conversation and notes.",
  };
}
