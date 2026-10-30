import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import { config, ROOT, DATA_DIR } from "./src/config.js";
import { db, save, newId, hashPin, checkPin } from "./src/db.js";
import { ai, initAI, callerReply, mentorReply, gradeAttempt, AIError } from "./src/ai.js";
import { runAction, publicEnv, ActionError } from "./src/console.js";
import { describeOutcome, CATEGORY_MAX } from "./src/prompts.js";
import { LABS, KB, DIFFICULTY, ESCALATION_TEAMS, getLab, publicLab } from "./labs/index.js";
import { buildDirectory } from "./labs/directory.js";

const app = express();
app.disable("x-powered-by");
// Behind a reverse proxy (Caddy on the cloud server), use the visitor's real IP
// for rate limiting instead of the proxy's.
if (config.trustProxy) app.set("trust proxy", "loopback");

// Private (desktop, not shared) mode: only the person at this computer may use
// the app. A tunnel such as Tailscale Funnel or Cloudflare also connects from
// this computer, so the client address alone isn't enough: also require a local
// Host name and no proxy headers.
if (config.localOnly) {
  const localHosts = new Set([`127.0.0.1:${config.port}`, `localhost:${config.port}`, `[::1]:${config.port}`]);
  app.use((req, res, next) => {
    const viaProxy = req.headers["x-forwarded-for"] || req.headers["x-forwarded-host"] || req.headers["forwarded"] || req.headers["cf-connecting-ip"] || req.headers["tailscale-funnel-request"];
    const remote = req.socket.remoteAddress || "";
    const fromThisPc = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
    if (fromThisPc && !viaProxy && localHosts.has(String(req.headers.host || "").toLowerCase())) return next();
    res.status(403).type("text").send("This copy of HelpDesk Academy only accepts connections from the computer it runs on. (Turn on sharing in its Settings to let others connect.)");
  });
}
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(express.static(path.join(ROOT, "public"), { extensions: ["html"] }));

// ------------------------------------------------------------------ helpers --
const RANKS = [
  { min: 0, title: "Trainee" },
  { min: 400, title: "Tier 1 Technician" },
  { min: 1100, title: "Senior Tier 1 Technician" },
  { min: 1900, title: "Tier 2 Technician" },
  { min: 2700, title: "Help Desk Lead" },
];
const MAX_XP = LABS.reduce((sum, l) => sum + 100 * DIFFICULTY[l.difficulty].multiplier, 0);

function rankFor(xp) {
  let current = RANKS[0];
  for (const r of RANKS) if (xp >= r.min) current = r;
  const next = RANKS.find((r) => r.min > xp) || null;
  return { title: current.title, xp, next: next ? { title: next.title, at: next.min } : null, maxXp: MAX_XP };
}

function attemptsFor(studentId) {
  return Object.values(db.attempts).filter((a) => a.studentId === studentId);
}

function progressFor(studentId) {
  const attempts = attemptsFor(studentId);
  const perLab = {};
  for (const lab of LABS) {
    const mine = attempts.filter((a) => a.labId === lab.id);
    const closed = mine.filter((a) => a.status === "closed" && a.grade);
    const best = closed.reduce((m, a) => Math.max(m, a.grade.total), -1);
    perLab[lab.id] = {
      attempts: closed.length,
      best: best >= 0 ? best : null,
      activeAttemptId: mine.find((a) => a.status === "active")?.id || null,
    };
  }
  const xp = LABS.reduce((sum, l) => sum + (perLab[l.id].best || 0) * DIFFICULTY[l.difficulty].multiplier, 0);
  const completed = LABS.filter((l) => perLab[l.id].best !== null).length;
  return { perLab, xp, completed, total: LABS.length, rank: rankFor(xp) };
}

function lastCaller(attempt) {
  const e = [...attempt.timeline].reverse().find((x) => x.type === "caller");
  return { frustration: e?.frustration ?? 2, resolved: !!e?.resolved, ended: !!e?.ended };
}

function studentView(attempt) {
  const lab = getLab(attempt.labId);
  return {
    id: attempt.id,
    labId: attempt.labId,
    lab: publicLab(lab),
    status: attempt.status,
    startedAt: attempt.startedAt,
    timeline: attempt.timeline.filter((e) => e.type !== "view"),
    env: publicEnv(attempt),
    notes: attempt.notes,
    hintsUsed: attempt.hintsUsed,
    maxHints: config.maxHintsPerAttempt,
    messagesLeft: Math.max(0, config.maxMessagesPerAttempt - attempt.timeline.filter((e) => e.type === "student").length),
    caller: lastCaller(attempt),
    closure: attempt.closure || null,
    grade: attempt.grade || null,
  };
}

function outcomeCheck(lab, closure) {
  const o = lab.outcome;
  let passed;
  if (o.type === "resolved") passed = closure.outcome === "resolved";
  else if (o.type === "escalated") passed = closure.outcome === "escalated" && closure.team === o.team;
  else passed = closure.outcome === "resolved" || (closure.outcome === "escalated" && closure.team === o.team);
  return { label: `Closed with the right outcome (${describeOutcome(o)})`, passed };
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Simple per-key rate limiter (in memory).
const hits = new Map();
function limit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new HttpError(429, "Slow down a little. Too many requests in a short time.");
  arr.push(now);
  hits.set(key, arr);
}

// One AI request at a time per attempt, so replies stay in order.
const busy = new Set();
async function withAttemptLock(id, fn) {
  if (busy.has(id)) throw new HttpError(409, "Still waiting on the last response. One moment.");
  busy.add(id);
  try {
    return await fn();
  } finally {
    busy.delete(id);
  }
}

// --------------------------------------------------------------------- auth --
function studentAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const session = token && db.sessions[token];
  const student = session && db.students[session.studentId];
  if (!student) return res.status(401).json({ error: "Please sign in again." });
  student.lastActive = new Date().toISOString();
  req.student = student;
  next();
}

const instructorTokens = new Map();
function instructorAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const exp = instructorTokens.get(token);
  if (!exp || exp < Date.now()) return res.status(401).json({ error: "Instructor sign-in required." });
  next();
}

function ownAttempt(req) {
  const attempt = db.attempts[req.params.id];
  if (!attempt || attempt.studentId !== req.student.id) throw new HttpError(404, "Ticket not found.");
  return attempt;
}

const failedLogins = new Map();

// --------------------------------------------------------------- public api --
app.get("/api/status", (req, res) => {
  res.json({
    aiMode: ai.mode,
    aiReason: ai.reason,
    classCodeRequired: !!config.classCode,
    labsCount: LABS.length,
  });
});

app.post(
  "/api/login",
  wrap(async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const pin = String(req.body.pin || "").trim();
    const displayName = String(req.body.displayName || "").trim().slice(0, 40);
    const classCode = String(req.body.classCode || "").trim();
    // A whole class can share one address (school network or tunnel), so the
    // per-address limit is generous; the per-username limit and the wrong-PIN
    // lockout below protect individual accounts.
    limit("login:" + req.ip, 80, 60_000);
    limit("login-user:" + username, 10, 60_000);

    if (config.classCode && classCode.toLowerCase() !== config.classCode.toLowerCase()) throw new HttpError(403, "That class code isn't right. Ask your instructor.");
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) throw new HttpError(400, "Username: 3-24 letters, numbers, dots, dashes or underscores.");
    if (!/^\d{4,8}$/.test(pin)) throw new HttpError(400, "PIN: 4 to 8 digits.");

    const fails = failedLogins.get(username);
    if (fails && fails.count >= 8 && Date.now() - fails.at < 5 * 60_000) throw new HttpError(429, "Too many wrong PINs. Wait 5 minutes or ask your instructor to reset it.");

    let student = Object.values(db.students).find((s) => s.username === username);
    if (student) {
      if (!checkPin(pin, student)) {
        failedLogins.set(username, { count: (fails?.count || 0) + 1, at: Date.now() });
        throw new HttpError(401, "Wrong PIN for that username. (If this isn't your account, pick a different username.)");
      }
      failedLogins.delete(username);
    } else {
      const { salt, hash } = hashPin(pin);
      student = { id: newId("s_"), username, displayName: displayName || username, salt, pinHash: hash, createdAt: new Date().toISOString() };
      db.students[student.id] = student;
    }
    student.lastActive = new Date().toISOString();
    const token = crypto.randomBytes(32).toString("hex");
    db.sessions[token] = { studentId: student.id, createdAt: new Date().toISOString() };
    save();
    res.json({ token, student: { username: student.username, displayName: student.displayName } });
  }),
);

app.post("/api/logout", studentAuth, (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  delete db.sessions[token];
  save();
  res.json({ ok: true });
});

app.get("/api/me", studentAuth, (req, res) => {
  res.json({ student: { username: req.student.username, displayName: req.student.displayName }, progress: progressFor(req.student.id) });
});

app.get("/api/labs", studentAuth, (req, res) => {
  const progress = progressFor(req.student.id);
  res.json({
    difficulties: DIFFICULTY,
    labs: LABS.map((l) => ({ ...publicLab(l), progress: progress.perLab[l.id] })),
    progress: { xp: progress.xp, completed: progress.completed, total: progress.total, rank: progress.rank },
  });
});

app.get("/api/kb", studentAuth, (req, res) => res.json({ articles: KB }));

app.get("/api/meta", studentAuth, (req, res) => res.json({ teams: ESCALATION_TEAMS, categoryMax: CATEGORY_MAX }));

app.post(
  "/api/labs/:labId/start",
  studentAuth,
  wrap(async (req, res) => {
    const lab = getLab(req.params.labId);
    if (!lab) throw new HttpError(404, "Lab not found.");
    const mine = attemptsFor(req.student.id).filter((a) => a.labId === lab.id && a.status === "active");
    if (mine.length && !req.body?.fresh) return res.json(studentView(mine[0]));
    for (const a of mine) a.status = "abandoned";

    const env = buildDirectory();
    lab.setup(env, lab);
    const now = new Date().toISOString();
    const attempt = {
      id: newId("a_"),
      studentId: req.student.id,
      labId: lab.id,
      status: "active",
      startedAt: now,
      env,
      timeline: [{ t: now, type: "caller", text: lab.caller.opening, frustration: 2, resolved: false, ended: false }],
      notes: "",
      hintsUsed: 0,
    };
    db.attempts[attempt.id] = attempt;
    save();
    res.json(studentView(attempt));
  }),
);

app.get("/api/attempts", studentAuth, (req, res) => {
  const list = attemptsFor(req.student.id)
    .filter((a) => a.status === "closed")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((a) => ({ id: a.id, labId: a.labId, title: getLab(a.labId)?.title, difficulty: getLab(a.labId)?.difficulty, startedAt: a.startedAt, total: a.grade?.total, verdict: a.grade?.verdict }));
  res.json({ attempts: list });
});

app.get(
  "/api/attempts/:id",
  studentAuth,
  wrap(async (req, res) => res.json(studentView(ownAttempt(req)))),
);

app.post(
  "/api/attempts/:id/message",
  studentAuth,
  wrap(async (req, res) => {
    const attempt = ownAttempt(req);
    const lab = getLab(attempt.labId);
    if (attempt.status !== "active") throw new HttpError(409, "This ticket is closed.");
    const text = String(req.body.text || "").trim();
    if (!text) throw new HttpError(400, "Type a message first.");
    if (text.length > config.maxMessageChars) throw new HttpError(400, `Keep messages under ${config.maxMessageChars} characters.`);
    if (attempt.timeline.filter((e) => e.type === "student").length >= config.maxMessagesPerAttempt)
      throw new HttpError(429, "You've hit the message limit for this ticket. Wrap up and close it.");
    limit("ai:" + req.student.id, 20, 60_000);

    await withAttemptLock(attempt.id, async () => {
      const studentEntry = { t: new Date().toISOString(), type: "student", text };
      attempt.timeline.push(studentEntry);
      let reply;
      try {
        reply = await callerReply(lab, attempt);
      } catch (err) {
        attempt.timeline.splice(attempt.timeline.indexOf(studentEntry), 1);
        throw err;
      }
      const callerEntry = { t: new Date().toISOString(), type: "caller", ...reply };
      attempt.timeline.push(callerEntry);
      save();
      res.json(studentView(attempt));
    });
  }),
);

app.post(
  "/api/attempts/:id/action",
  studentAuth,
  wrap(async (req, res) => {
    const attempt = ownAttempt(req);
    const lab = getLab(attempt.labId);
    if (attempt.status !== "active") throw new HttpError(409, "This ticket is closed.");
    limit("act:" + req.student.id, 60, 60_000);
    const result = runAction(attempt, lab, req.body);
    save();
    res.json({ result, attempt: studentView(attempt) });
  }),
);

app.post(
  "/api/attempts/:id/hint",
  studentAuth,
  wrap(async (req, res) => {
    const attempt = ownAttempt(req);
    const lab = getLab(attempt.labId);
    if (attempt.status !== "active") throw new HttpError(409, "This ticket is closed.");
    if (attempt.hintsUsed >= config.maxHintsPerAttempt) throw new HttpError(429, `You've used all ${config.maxHintsPerAttempt} hints for this ticket.`);
    const question = String(req.body.question || "").trim().slice(0, 500);
    limit("ai:" + req.student.id, 20, 60_000);
    await withAttemptLock(attempt.id, async () => {
      const answer = await mentorReply(lab, attempt, question, attempt.hintsUsed + 1);
      attempt.hintsUsed += 1;
      attempt.timeline.push({ t: new Date().toISOString(), type: "hint", question, answer });
      save();
      res.json(studentView(attempt));
    });
  }),
);

app.put(
  "/api/attempts/:id/notes",
  studentAuth,
  wrap(async (req, res) => {
    const attempt = ownAttempt(req);
    if (attempt.status !== "active") throw new HttpError(409, "This ticket is closed.");
    attempt.notes = String(req.body.notes || "").slice(0, 5000);
    save();
    res.json({ ok: true });
  }),
);

app.post(
  "/api/attempts/:id/close",
  studentAuth,
  wrap(async (req, res) => {
    const attempt = ownAttempt(req);
    const lab = getLab(attempt.labId);
    if (attempt.status !== "active") throw new HttpError(409, "This ticket is already closed.");
    const outcome = req.body.outcome === "escalated" ? "escalated" : "resolved";
    const team = outcome === "escalated" ? String(req.body.team || "") : null;
    if (outcome === "escalated" && !ESCALATION_TEAMS.includes(team)) throw new HttpError(400, "Pick the team you're escalating to.");
    const resolution = String(req.body.resolution || "").trim().slice(0, 5000);
    if (resolution.length < 20) throw new HttpError(400, "Write resolution notes (at least a couple of sentences) before closing.");
    limit("ai:" + req.student.id, 20, 60_000);

    await withAttemptLock(attempt.id, async () => {
      attempt.closure = { outcome, team, resolution, closedAt: new Date().toISOString() };
      const checks = [...lab.checks(attempt.env, attempt.timeline, attempt), outcomeCheck(lab, attempt.closure)];
      try {
        attempt.grade = await gradeAttempt(lab, attempt, checks);
      } catch (err) {
        attempt.closure = null;
        throw err;
      }
      attempt.status = "closed";
      save();
      res.json(studentView(attempt));
    });
  }),
);

// ----------------------------------------------------------- instructor api --
app.post(
  "/api/instructor/login",
  wrap(async (req, res) => {
    limit("ilogin:" + req.ip, 10, 60_000);
    const given = Buffer.from(String(req.body.password || ""));
    const real = Buffer.from(config.instructorPassword);
    if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) throw new HttpError(401, "Wrong instructor password.");
    const token = crypto.randomBytes(32).toString("hex");
    instructorTokens.set(token, Date.now() + 12 * 3600_000);
    res.json({ token });
  }),
);

function studentSummary(s) {
  const p = progressFor(s.id);
  const closed = attemptsFor(s.id).filter((a) => a.status === "closed" && a.grade);
  const active = attemptsFor(s.id).find((a) => a.status === "active");
  const bests = Object.values(p.perLab).filter((x) => x.best !== null).map((x) => x.best);
  return {
    id: s.id,
    username: s.username,
    displayName: s.displayName,
    createdAt: s.createdAt,
    lastActive: s.lastActive,
    xp: p.xp,
    rank: p.rank.title,
    completed: p.completed,
    attempts: closed.length,
    avgBest: bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null,
    workingOn: active ? getLab(active.labId)?.title : null,
    perLab: p.perLab,
  };
}

app.get("/api/instructor/overview", instructorAuth, (req, res) => {
  const students = Object.values(db.students).map(studentSummary).sort((a, b) => b.xp - a.xp);
  const closed = Object.values(db.attempts).filter((a) => a.status === "closed" && a.grade);
  const labs = LABS.map((l) => {
    const mine = closed.filter((a) => a.labId === l.id);
    const avg = mine.length ? Math.round(mine.reduce((s, a) => s + a.grade.total, 0) / mine.length) : null;
    const cats = {};
    for (const k of Object.keys(CATEGORY_MAX)) cats[k] = mine.length ? Math.round((mine.reduce((s, a) => s + a.grade.scores[k], 0) / mine.length / CATEGORY_MAX[k]) * 100) : null;
    return { id: l.id, title: l.title, difficulty: l.difficulty, attempts: mine.length, students: new Set(mine.map((a) => a.studentId)).size, avg, categoryPct: cats };
  });
  res.json({
    aiMode: ai.mode,
    aiReason: ai.reason,
    aiProvider: ai.providerName,
    aiModels: { caller: config.callerModels, grader: config.graderModels },
    classCode: config.classCode,
    students,
    labs,
    categoryMax: CATEGORY_MAX,
  });
});

app.get("/api/instructor/students/:id", instructorAuth, (req, res) => {
  const s = db.students[req.params.id];
  if (!s) return res.status(404).json({ error: "Student not found." });
  const attempts = attemptsFor(s.id)
    .filter((a) => a.status !== "abandoned")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((a) => ({
      id: a.id,
      labId: a.labId,
      title: getLab(a.labId)?.title,
      difficulty: getLab(a.labId)?.difficulty,
      status: a.status,
      startedAt: a.startedAt,
      closedAt: a.closure?.closedAt,
      total: a.grade?.total ?? null,
      verdict: a.grade?.verdict ?? null,
      hintsUsed: a.hintsUsed,
      messages: a.timeline.filter((e) => e.type === "student").length,
    }));
  res.json({ student: studentSummary(s), attempts });
});

app.get("/api/instructor/attempts/:id", instructorAuth, (req, res) => {
  const a = db.attempts[req.params.id];
  if (!a) return res.status(404).json({ error: "Attempt not found." });
  const lab = getLab(a.labId);
  res.json({
    id: a.id,
    student: { id: a.studentId, displayName: db.students[a.studentId]?.displayName, username: db.students[a.studentId]?.username },
    lab: { ...publicLab(lab), secret: lab.secret, expert: lab.expert, outcome: describeOutcome(lab.outcome) },
    status: a.status,
    startedAt: a.startedAt,
    timeline: a.timeline,
    notes: a.notes,
    hintsUsed: a.hintsUsed,
    closure: a.closure || null,
    grade: a.grade || null,
  });
});

app.post(
  "/api/instructor/students/:id/reset-pin",
  instructorAuth,
  wrap(async (req, res) => {
    const s = db.students[req.params.id];
    if (!s) throw new HttpError(404, "Student not found.");
    const pin = String(req.body.pin || "");
    if (!/^\d{4,8}$/.test(pin)) throw new HttpError(400, "PIN must be 4-8 digits.");
    Object.assign(s, (({ salt, hash }) => ({ salt, pinHash: hash }))(hashPin(pin)));
    for (const [tok, sess] of Object.entries(db.sessions)) if (sess.studentId === s.id) delete db.sessions[tok];
    failedLogins.delete(s.username);
    save();
    res.json({ ok: true });
  }),
);

app.delete(
  "/api/instructor/students/:id",
  instructorAuth,
  wrap(async (req, res) => {
    const s = db.students[req.params.id];
    if (!s) throw new HttpError(404, "Student not found.");
    for (const [id, a] of Object.entries(db.attempts)) if (a.studentId === s.id) delete db.attempts[id];
    for (const [tok, sess] of Object.entries(db.sessions)) if (sess.studentId === s.id) delete db.sessions[tok];
    delete db.students[s.id];
    save();
    res.json({ ok: true });
  }),
);

app.get("/api/instructor/export.csv", instructorAuth, (req, res) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cats = Object.keys(CATEGORY_MAX);
  const header = ["student", "username", "lab", "difficulty", "score", "verdict", ...cats, "hints", "outcome", "team", "started", "closed", "minutes"];
  const rows = Object.values(db.attempts)
    .filter((a) => a.status === "closed" && a.grade)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((a) => {
      const s = db.students[a.studentId] || {};
      const lab = getLab(a.labId);
      const mins = Math.round((new Date(a.closure.closedAt) - new Date(a.startedAt)) / 60000);
      return [s.displayName, s.username, lab?.title, lab?.difficulty, a.grade.total, a.grade.verdict, ...cats.map((k) => a.grade.scores[k]), a.hintsUsed, a.closure.outcome, a.closure.team || "", a.startedAt, a.closure.closedAt, mins];
    });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="helpdesk-academy-results-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send([header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n"));
});

// ------------------------------------------------------------------- errors --
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
app.use((err, req, res, next) => {
  if (err instanceof HttpError || err instanceof AIError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ActionError) return res.status(400).json({ error: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request." });
  console.error(err);
  res.status(500).json({ error: "Server error. Try again." });
});

// -------------------------------------------------------------------- start --
await initAI();

// Exported so the desktop app can wait until the server is listening.
export const server = await new Promise((resolve, reject) => {
  const s = app.listen(config.port, config.host, () => {
    printBanner();
    resolve(s);
  });
  s.on("error", (err) => {
    if (err.code === "EADDRINUSE") console.error(`\nPort ${config.port} is already in use. Is HelpDesk Academy already running? (Change PORT in .env to run a second copy.)\n`);
    reject(err);
  });
});

function printBanner() {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => `http://${i.address}:${config.port}`);
  const line = "-".repeat(64);
  const base = config.publicUrl || `http://localhost:${config.port}`;
  console.log(`\n${line}\n  HelpDesk Academy is running\n${line}`);
  console.log(`  On this computer:   http://localhost:${config.port}`);
  if (config.publicUrl) console.log(`  Students connect:   ${config.publicUrl}`);
  else if (lan.length) console.log(`  Students connect:   ${lan.join("  or  ")}`);
  console.log(`  Instructor view:    ${base}/instructor`);
  console.log(`  Instructor password: ${process.env.INSTRUCTOR_PASSWORD ? "(set in .env)" : "saved in " + path.join(DATA_DIR, "instructor-password.txt")}`);
  console.log(`  Class code:         ${config.classCode || "(none: anyone who can reach this server can join)"}`);
  console.log(`  AI:                 ${ai.mode === "live" ? `LIVE via ${ai.providerName} (caller: ${config.callerModels.join(" → ")}; grader: ${config.graderModels.join(" → ")})` : "DEMO MODE: " + ai.reason}`);
  console.log(`  Labs loaded:        ${LABS.length}`);
  console.log(line + "\n");
}
