import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load .env from the project root if present (Node 21.7+ has process.loadEnvFile).
// Variables already set in the environment win over the file. The desktop app
// points HDA_ENV_FILE at a settings file in the user's profile instead.
const envPath = process.env.HDA_ENV_FILE || path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn(`Could not read .env: ${err.message}`);
  }
}

const env = (key) => (process.env[key] || "").trim();
const list = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);

// A Groq key (gsk_...) pasted on the Claude line still works.
if (env("ANTHROPIC_API_KEY").startsWith("gsk_") && !env("GROQ_API_KEY")) {
  process.env.GROQ_API_KEY = env("ANTHROPIC_API_KEY");
  delete process.env.ANTHROPIC_API_KEY;
  console.warn("Note: the key in ANTHROPIC_API_KEY is a Groq key (gsk_...), so it's being used as GROQ_API_KEY.");
}

export const DATA_DIR = env("DATA_DIR") ? path.resolve(env("DATA_DIR")) : path.join(ROOT, "data");

function readInstructorPassword() {
  if (env("INSTRUCTOR_PASSWORD")) return env("INSTRUCTOR_PASSWORD");
  // No password set: generate one once and keep it in data/ so it survives restarts.
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, "instructor-password.txt");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const generated = crypto.randomBytes(12).toString("base64url");
  fs.writeFileSync(file, generated + "\n", { mode: 0o600 });
  return generated;
}

// Which AI service plays the callers and grades tickets.
//   anthropic: Claude (ANTHROPIC_API_KEY)
//   groq:      Groq's free tier (GROQ_API_KEY), OpenAI-compatible API
//   openai:    any other OpenAI-compatible server, e.g. Ollama (AI_BASE_URL, AI_API_KEY)
// If AI_PROVIDER isn't set, use whichever key is present (Claude first).
function resolveProvider() {
  const chosen = env("AI_PROVIDER").toLowerCase();
  if (chosen) return chosen;
  if (env("ANTHROPIC_API_KEY")) return "anthropic";
  if (env("GROQ_API_KEY")) return "groq";
  return "anthropic";
}

// Groq's free limits are per model, so each role lists backups to rotate to
// when one model is rate limited.
const PROVIDER_DEFAULTS = {
  anthropic: { caller: "claude-opus-5-5", grader: "claude-opus-5-5" },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: env("GROQ_API_KEY"),
    caller: "openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b",
    grader: "openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b",
    concurrency: 2,
  },
  openai: { baseUrl: env("AI_BASE_URL"), apiKey: env("AI_API_KEY"), caller: "", grader: "", concurrency: 2 },
};

const provider = resolveProvider();
const defaults = PROVIDER_DEFAULTS[provider];
if (!defaults) throw new Error(`AI_PROVIDER "${provider}" isn't supported. Use anthropic, groq, or openai.`);

const callerModels = list(env("CALLER_MODEL") || defaults.caller);
const graderModels = list(env("GRADER_MODEL") || defaults.grader || env("CALLER_MODEL"));

export const config = {
  port: Number(env("PORT")) || 3300,
  host: env("HOST") || "0.0.0.0",
  publicUrl: env("PUBLIC_URL").replace(/\/+$/, ""),
  trustProxy: ["1", "true", "yes"].includes(env("TRUST_PROXY").toLowerCase()),
  // The desktop app sets HDA_LOCAL_ONLY when only this computer should reach it.
  // Then no class code is needed, and the server refuses anything that arrives
  // through a proxy or tunnel (see server.js).
  localOnly: env("HDA_LOCAL_ONLY") === "1",
  classCode: env("HDA_LOCAL_ONLY") === "1" ? "" : env("CLASS_CODE"),
  instructorPassword: readInstructorPassword(),
  forceDemo: process.argv.includes("--demo") || env("AI_MODE") === "demo",

  aiProvider: provider,
  aiBaseUrl: (env("AI_BASE_URL") || defaults.baseUrl || "").replace(/\/+$/, ""),
  aiApiKey: provider === "groq" ? env("GROQ_API_KEY") || env("AI_API_KEY") : env("AI_API_KEY"),
  aiConcurrency: Number(env("AI_CONCURRENCY")) || defaults.concurrency || 8,
  callerModels,
  graderModels: graderModels.length ? graderModels : callerModels,
  callerEffort: env("CALLER_EFFORT") || "low",
  graderEffort: env("GRADER_EFFORT") || "medium",

  // Guard rails so one student can't run up the bill (or the free quota).
  maxMessagesPerAttempt: Number(env("MAX_MESSAGES_PER_ATTEMPT")) || 60,
  maxHintsPerAttempt: Number(env("MAX_HINTS_PER_ATTEMPT")) || 3,
  maxMessageChars: 1200,
  hintPenalty: env("HINT_PENALTY") ? Number(env("HINT_PENALTY")) : 3,
};
