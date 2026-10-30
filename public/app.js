import { $, $$, esc, api, md, fmtTime, fmtDateTime, mmss, scoreClass, toast, modal, LOGO } from "./common.js";

// ------------------------------------------------------------------ state --
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    } catch {}
  },
};

const S = {
  token: store.get("hda_token"),
  status: null,
  me: null,
  meta: null,
  kb: null,
  attempt: null,
  tool: "admin",
  adminTab: "users",
  userQuery: "",
  selUser: null,
  devQuery: "",
  selDev: null,
  kbQuery: "",
  kbOpen: null,
  sending: false,
  hinting: false,
  secret: null,
  timer: null,
  notesTimer: null,
};
const app = $("#app");

async function call(path, opts = {}) {
  try {
    return await api(path, { ...opts, token: S.token });
  } catch (err) {
    if (err.status === 401) {
      S.token = null;
      store.set("hda_token", null);
      renderLogin("Your session ended. Please sign in again.");
    }
    throw err;
  }
}

function stopTimers() {
  clearInterval(S.timer);
  S.timer = null;
}

// ----------------------------------------------------------------- routing --
window.addEventListener("hashchange", route);
async function route() {
  stopTimers();
  if (!S.token) return renderLogin();
  const h = location.hash;
  let m;
  try {
    if ((m = h.match(/^#\/ticket\/([\w-]+)$/))) return await openAttempt(m[1]);
    if ((m = h.match(/^#\/results\/([\w-]+)$/))) return await openResults(m[1]);
    return await renderQueue();
  } catch (err) {
    if (err.status !== 401) {
      toast(err.message, "error");
      if (h && h !== "#/") location.hash = "#/";
    }
  }
}

async function boot() {
  S.status = await api("/api/status").catch(() => ({ aiMode: "demo", aiReason: "", classCodeRequired: false }));
  if (S.token) {
    try {
      const me = await call("/api/me");
      S.me = me.student;
    } catch {
      /* call() already handles 401 */
    }
  }
  route();
}

// ------------------------------------------------------------------- login --
function renderLogin(message = "") {
  document.title = "Sign in · HelpDesk Academy";
  app.innerHTML = `
  <div class="login-wrap">
    <div class="card login-card">
      <div class="brand">${LOGO}<div>HelpDesk Academy<small>Brightline Logistics IT</small></div></div>
      <h1>Start your shift</h1>
      <p class="muted">New here? Pick a username and a PIN. Your account is created the first time you sign in.</p>
      <form id="login-form" style="margin-top:20px" autocomplete="off">
        <div class="field"><label for="u">Username</label><input id="u" name="username" type="text" required maxlength="24" placeholder="e.g. jsmith" autocapitalize="off" spellcheck="false" /></div>
        <div class="field"><label for="d">Your name <span class="muted">(first time only)</span></label><input id="d" name="displayName" type="text" maxlength="40" placeholder="Jordan Smith" /></div>
        <div class="field"><label for="p">PIN</label><input id="p" name="pin" type="password" inputmode="numeric" required maxlength="8" placeholder="4-8 digits" /></div>
        ${S.status?.classCodeRequired ? `<div class="field"><label for="c">Class code</label><input id="c" name="classCode" type="text" required placeholder="From your instructor" /></div>` : ""}
        <button class="btn primary" style="width:100%;padding:10px" type="submit">Sign in</button>
        <div class="error-text" id="login-error">${esc(message)}</div>
      </form>
    </div>
    <div class="login-side">
      <h2>What you'll practice</h2>
      <ul>
        <li><span class="dot">1</span><div><b>Real tickets, real callers</b><span class="muted">An AI plays each caller: their personality, their mood, and what's on their screen.</span></div></li>
        <li><span class="dot">2</span><div><b>Admin tools</b><span class="muted">Look up accounts, unlock, reset, manage groups and MFA, just like on the job.</span></div></li>
        <li><span class="dot">3</span><div><b>Policy matters</b><span class="muted">Verify identity, follow least privilege, and know when to escalate.</span></div></li>
        <li><span class="dot">4</span><div><b>Graded by a team lead</b><span class="muted">Get scored on troubleshooting, resolution, security, communication, and notes.</span></div></li>
      </ul>
    </div>
  </div>`;
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const res = await api("/api/login", { method: "POST", body: f });
      S.token = res.token;
      store.set("hda_token", res.token);
      S.me = res.student;
      location.hash = "#/";
      route();
    } catch (err) {
      $("#login-error").textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
  $("#u").focus();
}

// ------------------------------------------------------------------ appbar --
function appbar(progress) {
  const r = progress?.rank;
  const pct = r ? (r.next ? Math.min(100, (r.xp / r.next.at) * 100) : 100) : 0;
  return `
  <header class="appbar">
    <a class="brand" href="#/" style="color:inherit;text-decoration:none">${LOGO}<div>HelpDesk Academy<small>Brightline Logistics IT</small></div></a>
    <div class="spacer"></div>
    ${
      r
        ? `<div class="rank-chip" title="${r.next ? `${r.next.at - r.xp} XP to ${esc(r.next.title)}` : "Top rank reached"}">
            <span><b>${esc(r.title)}</b></span><div class="xpbar"><span style="width:${pct}%"></span></div><span>${r.xp} XP</span>
          </div>`
        : ""
    }
    <span class="small" style="opacity:.8">${esc(S.me?.displayName || "")}</span>
    <button class="btn sm" data-logout>Sign out</button>
  </header>`;
}

function bindAppbar() {
  $("[data-logout]")?.addEventListener("click", async () => {
    try {
      await call("/api/logout", { method: "POST" });
    } catch {}
    S.token = null;
    store.set("hda_token", null);
    location.hash = "";
    renderLogin();
  });
}

function demoBanner() {
  if (S.status?.aiMode === "live") return "";
  return `<div class="banner"><strong>Demo mode.</strong><span>The AI is turned off, so callers give placeholder replies and grades are rough estimates. ${esc(S.status?.aiReason || "")}</span></div>`;
}

// ------------------------------------------------------------------- queue --
const TIER_COPY = {
  easy: "One clear problem and a cooperative caller. Build your Tier 1 basics.",
  medium: "A twist, a policy to follow, or steps that must happen in the right order.",
  hard: "Security judgment, pressure, multiple problems, or knowing when and how to escalate.",
};

async function renderQueue() {
  document.title = "Ticket queue · HelpDesk Academy";
  const [data, hist] = await Promise.all([call("/api/labs"), call("/api/attempts")]);
  const { labs, progress, difficulties } = data;
  const r = progress.rank;
  const card = (l) => {
    const p = l.progress;
    const status = p.activeAttemptId
      ? `<span class="pill info">In progress</span><span class="muted">Resume →</span>`
      : p.best != null
        ? `<span>Best <span class="score-badge ${scoreClass(p.best)}">${p.best}</span> <span class="muted">· ${p.attempts} attempt${p.attempts === 1 ? "" : "s"}</span></span><span class="muted">Retry →</span>`
        : `<span class="pill">New</span><span class="muted">Open ticket →</span>`;
    return `
    <button class="lab-card ${l.difficulty}" data-lab="${esc(l.id)}">
      <div class="lab-top"><span class="ticket-no">${esc(l.ticket.number)}</span><span class="pill ${l.difficulty}">${esc(difficulties[l.difficulty].label)}</span></div>
      <h3>${esc(l.title)}</h3>
      <div class="meta">${esc(l.category)} · ${esc(l.ticket.channel)} · ~${l.estMinutes} min</div>
      <div class="skills">${l.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
      <div class="lab-foot">${status}</div>
    </button>`;
  };
  app.innerHTML = `
  ${appbar(progress)}
  <main class="queue">
    <section class="card hero">
      <div>
        <h1>Welcome back, ${esc(S.me?.displayName || "")}</h1>
        <p class="muted">You're on the Brightline Logistics help desk. Pick a ticket from the queue. Each one is a live caller.</p>
        <div class="progress-line" title="${progress.completed} of ${progress.total} labs completed"><span style="width:${(progress.completed / progress.total) * 100}%"></span></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${esc(r.title)}</b><span>Rank${r.next ? ` · ${r.next.at - r.xp} XP to next` : ""}</span></div>
        <div class="stat"><b>${r.xp}</b><span>XP</span></div>
        <div class="stat"><b>${progress.completed}/${progress.total}</b><span>Labs done</span></div>
      </div>
    </section>
    ${demoBanner()}
    ${["easy", "medium", "hard"]
      .map(
        (d) => `
      <section>
        <div class="tier-head"><h2>${esc(difficulties[d].label)}</h2><span class="pill ${d}">${esc(difficulties[d].tier)} · ${difficulties[d].multiplier}× XP</span><span class="muted small">${TIER_COPY[d]}</span></div>
        <div class="cards">${labs.filter((l) => l.difficulty === d).map(card).join("")}</div>
      </section>`,
      )
      .join("")}
    <section>
      <div class="tier-head"><h2>Your graded tickets</h2></div>
      <div class="card history">
        ${
          hist.attempts.length
            ? hist.attempts
                .map(
                  (a) => `<div class="history-row" data-result="${esc(a.id)}" role="button" tabindex="0">
                <div><b>${esc(a.title)}</b> <span class="pill ${a.difficulty}">${esc(a.difficulty)}</span><div class="muted small">${fmtDateTime(a.startedAt)}</div></div>
                <span class="muted small">${esc(a.verdict || "")}</span>
                <span class="score-badge ${scoreClass(a.total)}">${a.total ?? "-"}</span>
              </div>`,
                )
                .join("")
            : `<p class="muted" style="padding:14px 16px">No graded tickets yet. Start with an Easy one.</p>`
        }
      </div>
    </section>
  </main>`;
  bindAppbar();
  $$("[data-lab]").forEach((b) => b.addEventListener("click", () => startLab(b.dataset.lab)));
  $$("[data-result]").forEach((b) => {
    const go = () => (location.hash = `#/results/${b.dataset.result}`);
    b.addEventListener("click", go);
    b.addEventListener("keydown", (e) => e.key === "Enter" && go());
  });
}

async function startLab(labId, fresh = false) {
  try {
    const view = await call(`/api/labs/${encodeURIComponent(labId)}/start`, { method: "POST", body: { fresh } });
    S.attempt = view;
    resetWorkspaceState();
    location.hash = `#/ticket/${view.id}`;
  } catch (err) {
    toast(err.message, "error");
  }
}

function resetWorkspaceState() {
  Object.assign(S, { tool: "admin", adminTab: "users", userQuery: "", selUser: null, devQuery: "", selDev: null, kbQuery: "", kbOpen: null, secret: null });
}

// --------------------------------------------------------------- workspace --
async function openAttempt(id) {
  if (S.attempt?.id !== id) {
    S.attempt = await call(`/api/attempts/${id}`);
    resetWorkspaceState();
  }
  if (S.attempt.status === "closed") {
    location.hash = `#/results/${id}`;
    return;
  }
  if (!S.meta) S.meta = await call("/api/meta");
  if (!S.kb) S.kb = (await call("/api/kb")).articles;
  renderWorkspace();
}

const MOOD = ["", "Calm", "Okay", "Impatient", "Frustrated", "Very upset"];

function renderWorkspace() {
  const a = S.attempt;
  const t = a.lab.ticket;
  document.title = `${t.number} · ${a.lab.title}`;
  app.innerHTML = `
  <div class="ws">
    <header class="ws-bar">
      <a class="btn sm ghost" href="#/" title="Back to the ticket queue (your progress is saved)">← Queue</a>
      <div class="ws-title"><span class="ticket-no">${esc(t.number)}</span><strong>${esc(a.lab.title)}</strong><span class="pill ${a.lab.difficulty}">${esc(a.lab.difficulty)}</span></div>
      <div class="ws-meta"><span class="pill">${esc(t.priority)}</span><span class="pill">${esc(t.channel)}</span><span class="timer" id="timer" title="Time on ticket">00:00</span></div>
      <div id="mood-slot"></div>
      <button class="btn sm" id="restart-btn" title="Throw this attempt away and start the ticket over">Restart</button>
      <button class="btn primary sm" id="close-btn">Close ticket…</button>
    </header>
    <div class="ws-grid">
      <aside class="ws-left" id="left-pane"></aside>
      <section class="ws-chat">
        <div class="chat-log" id="chat-log" aria-live="polite"></div>
        <div>
          <div class="composer">
            <label for="composer" class="sr-only">Message to caller</label>
            <textarea id="composer" rows="1" maxlength="1200" placeholder="${t.channel === "Chat" ? "Message" : "Say something to"} ${esc(a.lab.callerName.split(" ")[0])}…"></textarea>
            <button class="btn primary" id="send-btn">Send</button>
          </div>
          <div class="composer-meta"><span id="composer-note">Enter to send · Shift+Enter for a new line</span><span id="msgs-left"></span></div>
        </div>
      </section>
      <aside class="ws-tools" id="tools"></aside>
    </div>
  </div>`;

  renderLeft();
  renderChat();
  renderMood();
  renderTools();

  const start = new Date(a.startedAt).getTime();
  const tick = () => {
    const el = $("#timer");
    if (el) el.textContent = mmss(Date.now() - start);
  };
  tick();
  S.timer = setInterval(tick, 1000);

  const box = $("#composer");
  box.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  });
  box.addEventListener("input", () => {
    box.style.height = "auto";
    box.style.height = Math.min(160, box.scrollHeight) + "px";
  });
  $("#send-btn").addEventListener("click", sendMessage);
  $("#close-btn").addEventListener("click", closeTicket);
  $("#restart-btn").addEventListener("click", async () => {
    const ok = await modal({
      title: "Restart this ticket?",
      body: `<p>This throws away the current attempt (conversation, notes, and console changes) and starts ${esc(a.lab.title)} fresh. It won't be graded.</p>`,
      confirmText: "Restart",
      danger: true,
    });
    if (ok) startLab(a.labId, true);
  });
  box.focus();
}

function renderMood() {
  const c = S.attempt.caller;
  const slot = $("#mood-slot");
  if (!slot) return;
  slot.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center">
      <div class="mood" data-level="${c.frustration}" title="How the caller feels right now">
        <span class="muted">Caller</span><span class="segs"><i></i><i></i><i></i><i></i><i></i></span><b>${MOOD[c.frustration]}</b>
      </div>
      ${c.resolved ? `<span class="pill ok resolved-chip" title="The caller says their problem is fixed">✓ Caller confirms fixed</span>` : ""}
    </div>`;
}

function renderLeft() {
  const a = S.attempt;
  const t = a.lab.ticket;
  $("#left-pane").innerHTML = `
    <div class="card ticket-card">
      <div class="section-label">Ticket</div>
      <span class="ticket-no">${esc(t.number)}</span>
      <h3>${esc(t.subject)}</h3>
      <dl class="kv">
        <dt>Caller</dt><dd>${esc(t.callerLabel)}</dd>
        <dt>Contact</dt><dd>${esc(t.contact)}</dd>
        <dt>Channel</dt><dd>${esc(t.channel)}</dd>
        <dt>Priority</dt><dd>${esc(t.priority)}</dd>
        <dt>Category</dt><dd>${esc(a.lab.category)}</dd>
      </dl>
      <div class="desc">${esc(t.description)}</div>
    </div>
    <div class="notes-box">
      <div class="section-label"><span>Work notes</span><span class="muted" id="notes-state" style="text-transform:none;letter-spacing:0;font-weight:500"></span></div>
      <textarea id="notes" placeholder="Private scratchpad: what you've checked, what you found, next steps. Your team lead can see these.">${esc(a.notes || "")}</textarea>
    </div>
    <div class="card" style="padding:12px 14px;font-size:13px">
      <div class="section-label">Skills in this lab</div>
      <div class="skills">${a.lab.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
    </div>`;
  $("#notes").addEventListener("input", (e) => {
    $("#notes-state").textContent = "Saving…";
    clearTimeout(S.notesTimer);
    S.notesTimer = setTimeout(async () => {
      try {
        await call(`/api/attempts/${S.attempt.id}/notes`, { method: "PUT", body: { notes: e.target.value } });
        S.attempt.notes = e.target.value;
        $("#notes-state").textContent = "Saved";
      } catch (err) {
        $("#notes-state").textContent = "Not saved";
        toast(err.message, "error");
      }
    }, 700);
  });
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function chatEntryHtml(e) {
  const a = S.attempt;
  if (e.type === "caller")
    return `
    <div class="msg">
      <div class="avatar">${esc(initials(a.lab.callerName))}</div>
      <div><div class="who">${esc(a.lab.callerName)} · ${fmtTime(e.t)}</div><div class="bubble">${esc(e.text)}</div></div>
    </div>${e.ended ? `<div class="sys-line ended">${esc(a.lab.callerName.split(" ")[0])} ended the ${a.lab.ticket.channel === "Chat" ? "chat" : "call"}.</div>` : ""}`;
  if (e.type === "student")
    return `
    <div class="msg me">
      <div class="avatar">You</div>
      <div><div class="who">You · ${fmtTime(e.t)}</div><div class="bubble">${esc(e.text)}</div></div>
    </div>`;
  if (e.type === "action")
    return `<div class="sys-line"><span class="tag">Admin Center</span>${esc(e.text)}${e.secret ? `<span class="secret" title="Only you can see this">${esc(e.secret)}</span>` : ""}</div>`;
  return "";
}

function renderChat(pending = null) {
  const log = $("#chat-log");
  if (!log) return;
  const a = S.attempt;
  let html = a.timeline.map(chatEntryHtml).join("");
  if (pending) {
    html += chatEntryHtml({ type: "student", text: pending, t: new Date().toISOString() });
    html += `<div class="msg"><div class="avatar">${esc(initials(a.lab.callerName))}</div><div class="bubble typing" aria-label="Caller is typing"><i></i><i></i><i></i></div></div>`;
  }
  log.innerHTML = html;
  log.scrollTop = log.scrollHeight;
  const left = $("#msgs-left");
  if (left) left.textContent = a.messagesLeft <= 15 ? `${a.messagesLeft} messages left` : "";
  const note = $("#composer-note");
  if (note)
    note.textContent = a.caller.ended
      ? `${a.lab.callerName.split(" ")[0]} has hung up. You can still message (they'll pick up) or close the ticket.`
      : "Enter to send · Shift+Enter for a new line";
}

async function sendMessage() {
  if (S.sending) return;
  const box = $("#composer");
  const text = box.value.trim();
  if (!text) return;
  S.sending = true;
  box.value = "";
  box.style.height = "auto";
  $("#send-btn").disabled = true;
  renderChat(text);
  try {
    S.attempt = await call(`/api/attempts/${S.attempt.id}/message`, { method: "POST", body: { text } });
    renderChat();
    renderMood();
  } catch (err) {
    renderChat();
    if (err.status !== 401) {
      toast(err.message, "error", 5000);
      box.value = text;
    }
  } finally {
    S.sending = false;
    const btn = $("#send-btn");
    if (btn) btn.disabled = false;
    $("#composer")?.focus();
  }
}

// ------------------------------------------------------------------- tools --
function renderTools() {
  const a = S.attempt;
  const hintsLeft = a.maxHints - a.hintsUsed;
  $("#tools").innerHTML = `
    <div class="tabs" role="tablist">
      <button class="tab ${S.tool === "admin" ? "active" : ""}" data-tool="admin" role="tab">Admin Center</button>
      <button class="tab ${S.tool === "kb" ? "active" : ""}" data-tool="kb" role="tab">Knowledge Base</button>
      <button class="tab ${S.tool === "mentor" ? "active" : ""}" data-tool="mentor" role="tab">Senior Tech <span class="muted small">(${hintsLeft})</span></button>
    </div>
    <div id="tool-content"></div>`;
  $$("[data-tool]").forEach((b) =>
    b.addEventListener("click", () => {
      S.tool = b.dataset.tool;
      renderTools();
    }),
  );
  const host = $("#tool-content");
  if (S.tool === "admin") renderAdmin(host);
  else if (S.tool === "kb") renderKb(host);
  else renderMentor(host);
}

// ---- Admin Center
function renderAdmin(host) {
  host.innerHTML = `
    <div class="admin-brand"><span><b>Brightline Admin Center</b></span><span>Every change is logged to this ticket</span></div>
    <div class="subtabs">
      ${["users", "devices", "requests"].map((t) => `<button class="subtab ${S.adminTab === t ? "active" : ""}" data-sub="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
    </div>
    <div class="tool-body" id="admin-body"></div>`;
  $$("[data-sub]", host).forEach((b) =>
    b.addEventListener("click", () => {
      S.adminTab = b.dataset.sub;
      renderAdmin(host);
    }),
  );
  const body = $("#admin-body");
  if (S.adminTab === "users") renderUsers(body);
  else if (S.adminTab === "devices") renderDevices(body);
  else renderRequests(body);
}

const nameOf = (username) => S.attempt.env.users.find((u) => u.username === username)?.displayName || username || "-";

function renderUsers(body) {
  body.innerHTML = `
    <input type="search" id="user-q" placeholder="Search users: name, username, employee ID, department, phone" value="${esc(S.userQuery)}" />
    <div class="result-list" id="user-results"></div>
    <div id="user-detail"></div>`;
  const q = $("#user-q");
  q.addEventListener("input", () => {
    S.userQuery = q.value;
    renderUserResults();
  });
  renderUserResults();
  renderUserDetail();
}

function renderUserResults() {
  const q = S.userQuery.trim().toLowerCase();
  const el = $("#user-results");
  if (!el) return;
  if (q.length < 2) {
    el.innerHTML = `<p class="muted small">Type at least 2 characters to search the directory.</p>`;
    return;
  }
  const hits = S.attempt.env.users.filter((u) =>
    [u.displayName, u.username, u.employeeId, u.department, u.title, u.phone].some((v) => String(v || "").toLowerCase().includes(q)),
  );
  el.innerHTML = hits.length
    ? hits
        .map(
          (u) => `<button class="result-row ${S.selUser === u.username ? "active" : ""}" data-user="${esc(u.username)}">
          <span><b>${esc(u.displayName)}</b> <span class="sub mono">${esc(u.username)}</span><br><span class="sub">${esc(u.title)} · ${esc(u.department)}</span></span>
          <span>${u.locked ? `<span class="pill bad">Locked</span>` : ""}${!u.enabled ? `<span class="pill bad">Disabled</span>` : ""}${u.vip ? `<span class="pill warn">VIP</span>` : ""}</span>
        </button>`,
        )
        .join("")
    : `<p class="muted small">No users match "${esc(S.userQuery)}".</p>`;
  $$("[data-user]", el).forEach((b) => b.addEventListener("click", () => selectUser(b.dataset.user)));
}

function selectUser(username) {
  S.selUser = username;
  S.secret = null;
  renderUserResults();
  renderUserDetail();
  call(`/api/attempts/${S.attempt.id}/action`, { method: "POST", body: { type: "view_user", username } }).catch(() => {});
  $("#user-detail")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function secretBox() {
  if (!S.secret) return "";
  return `<div class="secret-box"><div>${esc(S.secret.message)}</div><code>${esc(S.secret.secret)}</code>
    <div class="actions" style="margin-top:8px"><button class="btn xs" data-copy>Copy</button><button class="btn xs ghost" data-dismiss-secret>Dismiss</button></div></div>`;
}

function renderUserDetail() {
  const el = $("#user-detail");
  if (!el) return;
  const env = S.attempt.env;
  const u = env.users.find((x) => x.username === S.selUser);
  if (!u) {
    el.innerHTML = "";
    return;
  }
  const devices = env.devices.filter((d) => d.assignedTo === u.username);
  const otherGroups = env.groups.filter((g) => !u.groups.includes(g.name));
  const pctMail = Math.round((u.mailbox.usedGB / u.mailbox.quotaGB) * 100);
  const expired = u.passwordExpired;
  el.innerHTML = `
  <div class="card detail">
    ${secretBox()}
    <div class="detail-head">
      <div><h3>${esc(u.displayName)} ${u.vip ? `<span class="pill warn">VIP</span>` : ""}</h3><div class="muted small">${esc(u.title)} · ${esc(u.department)}</div></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
        ${u.enabled ? `<span class="pill ok">Enabled</span>` : `<span class="pill bad">Disabled</span>`}
        ${u.locked ? `<span class="pill bad">Locked out</span>` : ""}
        ${expired ? `<span class="pill bad">Password expired</span>` : ""}
      </div>
    </div>
    ${u.flags.map((f) => `<div class="flag">${esc(f)}</div>`).join("")}
    <dl class="kv">
      <dt>Username</dt><dd class="mono">${esc(u.username)}</dd>
      <dt>Email</dt><dd>${esc(u.username)}@brightline.local</dd>
      <dt>Employee ID</dt><dd>${esc(u.employeeId)}</dd>
      <dt>Manager</dt><dd>${u.manager ? esc(nameOf(u.manager)) : "-"}</dd>
      <dt>Office</dt><dd>${esc(u.office)}</dd>
      <dt>Phone on file</dt><dd>${esc(u.phone)}</dd>
    </dl>

    <div class="box">
      <h4>Account</h4>
      <dl class="kv">
        <dt>Lockout</dt><dd>${u.locked ? `<b style="color:var(--danger)">Locked</b> (${u.badPwdCount} bad attempts)` : `Not locked (${u.badPwdCount} bad attempts)`}</dd>
        <dt>Password set</dt><dd>${esc(u.passwordLastSet)}</dd>
        <dt>Expires</dt><dd>${expired ? `<b style="color:var(--danger)">Expired ${esc(u.passwordExpires)}</b>` : esc(u.passwordExpires)}</dd>
        ${u.mustChangeAtNextLogon ? `<dt>Next logon</dt><dd>Must change password</dd>` : ""}
        <dt>Sessions</dt><dd>${u.activeSessions} active</dd>
      </dl>
      <div class="actions" style="margin-top:10px">
        <button class="btn sm" data-act="unlock_account">Unlock</button>
        <button class="btn sm" data-act="reset_password">Reset password…</button>
        <button class="btn sm" data-act="revoke_sessions">Revoke sessions</button>
        ${u.enabled ? `<button class="btn sm danger" data-act="disable_account">Disable</button>` : `<button class="btn sm" data-act="enable_account">Enable</button>`}
        <button class="btn sm" data-act="callback" title="Call the number on file to verify identity">📞 Call number on file</button>
      </div>
    </div>

    <div class="box">
      <h4>Group memberships</h4>
      ${u.groups
        .map(
          (g) => `<div class="list-row"><span class="mono">${esc(g)}</span><span class="muted small" style="flex:1;margin-left:8px">${esc(env.groups.find((x) => x.name === g)?.description || "")}</span>
          ${g === "SG-AllStaff" ? "" : `<button class="btn xs danger" data-act="remove_group" data-group="${esc(g)}">Remove</button>`}</div>`,
        )
        .join("")}
      <div class="inline-form" style="margin-top:8px">
        <select id="add-group"><option value="">Add to group…</option>${otherGroups.map((g) => `<option value="${esc(g.name)}">${esc(g.name)}: ${esc(g.description)}</option>`).join("")}</select>
        <button class="btn sm" data-act="add_group">Add</button>
      </div>
    </div>

    <div class="box">
      <h4><span>MFA methods</span><button class="btn xs danger" data-act="reset_mfa">Reset MFA…</button></h4>
      ${
        u.mfa.length
          ? u.mfa
              .map(
                (m) => `<div class="list-row"><span><b>${esc(m.type)}</b><br><span class="muted small">${esc(m.device)} · added ${esc(m.added)}</span></span>
              <button class="btn xs danger" data-act="remove_mfa_method" data-method="${esc(m.id)}">Remove</button></div>`,
              )
              .join("")
          : `<p class="muted small">${u.mfaReregisterRequired ? "No methods. User must register MFA at next sign-in." : "No MFA methods registered."}</p>`
      }
    </div>

    <div class="box">
      <h4>Mailbox</h4>
      <div class="small">${u.mailbox.usedGB} GB of ${u.mailbox.quotaGB} GB used (${pctMail}%)</div>
      <div class="meter ${pctMail > 90 ? "red" : ""}"><span style="width:${pctMail}%"></span></div>
      <div class="list-row" style="margin-top:8px"><span><b>Forwarding:</b> ${u.mailbox.forwarding ? `<span style="color:var(--danger)">${esc(u.mailbox.forwarding)}</span>` : "None"}</span>
        ${u.mailbox.forwarding ? `<button class="btn xs danger" data-act="remove_forwarding">Remove</button>` : ""}</div>
      <div style="margin-top:6px"><b class="small">Inbox rules</b></div>
      ${
        u.mailbox.rules.length
          ? `<table class="mini"><thead><tr><th>Name</th><th>If</th><th>Then</th><th></th></tr></thead><tbody>${u.mailbox.rules
              .map(
                (r) => `<tr><td class="mono">${esc(r.name)}${r.enabled ? "" : ` <span class="pill">off</span>`}<br><span class="muted">${esc(r.created || "")}</span></td><td>${esc(r.conditions)}</td><td>${esc(r.actions)}</td>
                <td style="white-space:nowrap">${r.enabled ? `<button class="btn xs" data-act="disable_inbox_rule" data-rule="${esc(r.id)}">Disable</button> ` : ""}<button class="btn xs danger" data-act="delete_inbox_rule" data-rule="${esc(r.id)}">Delete</button></td></tr>`,
              )
              .join("")}</tbody></table>`
          : `<p class="muted small">No inbox rules.</p>`
      }
    </div>

    <div class="box">
      <h4>Recent sign-ins</h4>
      <table class="mini"><thead><tr><th>Time</th><th>App</th><th>Location / IP</th><th>Result</th></tr></thead><tbody>
      ${u.signIns
        .map(
          (s) => `<tr class="${/fail/i.test(s.result) ? "bad" : ""}"><td style="white-space:nowrap">${fmtDateTime(s.time)}</td><td>${esc(s.app)}</td><td>${esc(s.location)}<br><span class="mono muted">${esc(s.ip)}</span></td><td>${esc(s.result)}</td></tr>`,
        )
        .join("")}
      </tbody></table>
    </div>

    <div class="box">
      <h4>Assigned devices</h4>
      ${devices.length ? devices.map((d) => `<div class="list-row"><span class="mono">${esc(d.hostname)}</span><span class="muted small">${esc(d.model)}</span><button class="btn xs" data-open-device="${esc(d.hostname)}">Open</button></div>`).join("") : `<p class="muted small">No devices assigned.</p>`}
    </div>
  </div>`;
  bindDetail(el, { username: u.username });
}

function bindDetail(el, base) {
  $$("[data-act]", el).forEach((b) =>
    b.addEventListener("click", () => {
      const params = { ...base };
      if (b.dataset.group) params.group = b.dataset.group;
      if (b.dataset.method) params.methodId = b.dataset.method;
      if (b.dataset.rule) params.ruleId = b.dataset.rule;
      if (b.dataset.key) params.keyId = b.dataset.key;
      if (b.dataset.act === "add_group") {
        params.group = $("#add-group")?.value;
        if (!params.group) return toast("Pick a group first.");
      }
      doAction(b.dataset.act, params);
    }),
  );
  $$("[data-open-device]", el).forEach((b) =>
    b.addEventListener("click", () => {
      S.adminTab = "devices";
      S.devQuery = b.dataset.openDevice;
      S.selDev = b.dataset.openDevice;
      S.secret = null;
      renderTools();
      call(`/api/attempts/${S.attempt.id}/action`, { method: "POST", body: { type: "view_device", hostname: S.selDev } }).catch(() => {});
    }),
  );
  $("[data-copy]", el)?.addEventListener("click", () => {
    navigator.clipboard?.writeText(S.secret.secret).then(
      () => toast("Copied."),
      () => toast("Couldn't copy. Select the text instead."),
    );
  });
  $("[data-dismiss-secret]", el)?.addEventListener("click", () => {
    S.secret = null;
    S.adminTab === "devices" ? renderDeviceDetail() : renderUserDetail();
  });
}

const CONFIRM = {
  revoke_sessions: (p) => ({ title: "Revoke all sessions?", body: `<p>${esc(nameOf(p.username))} will be signed out of every app on every device and must sign in again.</p>`, confirmText: "Revoke sessions" }),
  disable_account: (p) => ({ title: "Disable this account?", body: `<p>${esc(nameOf(p.username))} won't be able to sign in anywhere until it's re-enabled.</p>`, confirmText: "Disable", danger: true }),
  reset_mfa: (p) => ({ title: "Reset MFA?", body: `<p>Removes <b>all</b> of ${esc(nameOf(p.username))}'s MFA methods. They'll have to register again at next sign-in.</p><p class="muted small">Policy (KB-012): MFA resets need stronger verification.</p>`, confirmText: "Reset MFA", danger: true }),
  remove_mfa_method: (p) => ({ title: "Remove this MFA method?", body: `<p>The method will stop working for ${esc(nameOf(p.username))} immediately.</p>`, confirmText: "Remove", danger: true }),
  remove_group: (p) => ({ title: `Remove from ${p.group}?`, body: `<p>${esc(nameOf(p.username))} will lose this access after their next sign-in.</p>`, confirmText: "Remove", danger: true }),
  add_group: (p) => ({ title: `Add to ${p.group}?`, body: `<p>Grant ${esc(nameOf(p.username))} membership in <b>${esc(p.group)}</b>.</p><p class="muted small">Policy (KB-003): access needs an approved request.</p>`, confirmText: "Add to group" }),
  delete_inbox_rule: () => ({ title: "Delete this inbox rule?", body: `<p>The rule will be permanently removed from the mailbox.</p>`, confirmText: "Delete", danger: true }),
  remove_forwarding: (p) => ({ title: "Remove mailbox forwarding?", body: `<p>Stop forwarding ${esc(nameOf(p.username))}'s mail.</p>`, confirmText: "Remove forwarding", danger: true }),
  reveal_bitlocker: (p) => ({
    title: "Reveal BitLocker recovery key?",
    body: `<p>Key ID <span class="mono">${esc(p.keyId)}</span> on <b>${esc(p.hostname)}</b>.</p><div class="flag">Recovery key lookups are audited. Make sure the caller is verified (KB-008) and that this Key ID matches their screen.</div>`,
    confirmText: "Reveal key",
  }),
};

async function doAction(type, params) {
  if (type === "reset_password") {
    const res = await modal({
      title: `Reset password for ${nameOf(params.username)}?`,
      body: `<p>A temporary password will be generated for you to give to the user.</p>
        <label class="check"><input type="checkbox" name="mustChange" checked /> User must change password at next logon</label>
        <p class="muted small">Policy: verify identity first (KB-001). Remote users: see KB-007.</p>`,
      confirmText: "Reset password",
      danger: true,
    });
    if (!res) return;
    params.mustChange = res.mustChange;
  } else if (CONFIRM[type]) {
    if (!(await modal(CONFIRM[type](params)))) return;
  }
  try {
    const res = await call(`/api/attempts/${S.attempt.id}/action`, { method: "POST", body: { type, ...params } });
    S.attempt = res.attempt;
    const r = res.result;
    S.secret = r.secret ? { message: r.message, secret: r.secret } : null;
    renderTools();
    renderChat();
    if (r.callback) {
      await modal({ title: "📞 Verification callback", body: `<p>${esc(r.message)}</p>`, confirmText: "Hang up", hideCancel: true });
    } else if (!r.secret && r.message) toast(r.message);
  } catch (err) {
    toast(err.message, "error");
  }
}

function renderDevices(body) {
  body.innerHTML = `
    <input type="search" id="dev-q" placeholder="Search devices: hostname, user, model" value="${esc(S.devQuery)}" />
    <div class="result-list" id="dev-results"></div>
    <div id="dev-detail"></div>`;
  const q = $("#dev-q");
  q.addEventListener("input", () => {
    S.devQuery = q.value;
    renderDeviceResults();
  });
  renderDeviceResults();
  renderDeviceDetail();
}

function renderDeviceResults() {
  const el = $("#dev-results");
  if (!el) return;
  const q = S.devQuery.trim().toLowerCase();
  if (q.length < 2) {
    el.innerHTML = `<p class="muted small">Type at least 2 characters (try an asset tag like BL-LT-…).</p>`;
    return;
  }
  const hits = S.attempt.env.devices.filter((d) => [d.hostname, d.assignedTo, nameOf(d.assignedTo), d.model].some((v) => String(v).toLowerCase().includes(q)));
  el.innerHTML = hits.length
    ? hits
        .map(
          (d) => `<button class="result-row ${S.selDev === d.hostname ? "active" : ""}" data-dev="${esc(d.hostname)}">
          <span><b class="mono">${esc(d.hostname)}</b><br><span class="sub">${esc(nameOf(d.assignedTo))} · ${esc(d.model)}</span></span><span class="sub">${esc(d.type)}</span></button>`,
        )
        .join("")
    : `<p class="muted small">No devices match.</p>`;
  $$("[data-dev]", el).forEach((b) =>
    b.addEventListener("click", () => {
      S.selDev = b.dataset.dev;
      S.secret = null;
      renderDeviceResults();
      renderDeviceDetail();
      call(`/api/attempts/${S.attempt.id}/action`, { method: "POST", body: { type: "view_device", hostname: S.selDev } }).catch(() => {});
    }),
  );
}

function renderDeviceDetail() {
  const el = $("#dev-detail");
  if (!el) return;
  const d = S.attempt.env.devices.find((x) => x.hostname === S.selDev);
  if (!d) {
    el.innerHTML = "";
    return;
  }
  const used = d.diskTotalGB - d.diskFreeGB;
  const pct = Math.round((used / d.diskTotalGB) * 100);
  el.innerHTML = `
  <div class="card detail">
    ${secretBox()}
    <div class="detail-head"><div><h3 class="mono">${esc(d.hostname)}</h3><div class="muted small">${esc(d.type)} · ${esc(d.model)}</div></div></div>
    ${d.notes ? `<div class="flag">${esc(d.notes)}</div>` : ""}
    <dl class="kv">
      <dt>Assigned to</dt><dd>${esc(nameOf(d.assignedTo))} <span class="mono muted">(${esc(d.assignedTo)})</span></dd>
      <dt>OS</dt><dd>${esc(d.os)}</dd>
      <dt>IP address</dt><dd class="mono">${esc(d.ip)}</dd>
      <dt>Last seen</dt><dd>${fmtDateTime(d.lastSeen)}</dd>
    </dl>
    <div class="box"><h4>Disk (C:)</h4>
      <div class="small">${d.diskFreeGB} GB free of ${d.diskTotalGB} GB</div>
      <div class="meter ${d.diskFreeGB / d.diskTotalGB < 0.1 ? "red" : ""}"><span style="width:${pct}%"></span></div>
    </div>
    <div class="box"><h4>BitLocker recovery keys</h4>
      ${d.bitlocker
        .map(
          (k) => `<div class="list-row"><span><span class="mono small">${esc(k.keyId)}</span><br><span class="muted small">Stored ${esc(k.created)}</span>
          ${k.recoveryKey ? `<br><code class="mono" style="user-select:all">${esc(k.recoveryKey)}</code>` : ""}</span>
          ${k.recoveryKey ? `<span class="pill info">Revealed</span>` : `<button class="btn xs" data-act="reveal_bitlocker" data-key="${esc(k.keyId)}">Reveal…</button>`}</div>`,
        )
        .join("")}
    </div>
  </div>`;
  bindDetail(el, { hostname: d.hostname });
}

function renderRequests(body) {
  const reqs = [...S.attempt.env.requests].sort((a, b) => b.date.localeCompare(a.date));
  const cls = (s) => (/reject/i.test(s) ? "bad" : /approved/i.test(s) ? "warn" : /fulfilled/i.test(s) ? "ok" : "");
  body.innerHTML = `<p class="muted small">Access requests from the service portal. Help desk fulfills approved requests only (KB-003).</p>
  ${reqs
    .map(
      (r) => `<div class="box">
      <h4><span class="mono">${esc(r.id)}</span><span class="pill ${cls(r.status)}">${esc(r.status)}</span></h4>
      <dl class="kv">
        <dt>For</dt><dd>${esc(nameOf(r.requestedFor))} <span class="mono muted">(${esc(r.requestedFor)})</span></dd>
        <dt>Item</dt><dd class="mono">${esc(r.item)}</dd>
        <dt>Type</dt><dd>${esc(r.type)}</dd>
        <dt>Requested by</dt><dd>${esc(nameOf(r.requestedBy))} on ${esc(r.date)}</dd>
        <dt>Approver</dt><dd>${esc(nameOf(r.approver))}</dd>
        <dt>Justification</dt><dd>${esc(r.justification)}</dd>
      </dl></div>`,
    )
    .join("")}`;
}

// ---- Knowledge base
function renderKb(host) {
  if (S.kbOpen) {
    const k = S.kb.find((x) => x.id === S.kbOpen);
    host.innerHTML = `<div class="tool-body">
      <button class="btn sm ghost" data-kb-back style="justify-self:start">← All articles</button>
      <div class="card" style="padding:16px"><div class="ticket-no">${esc(k.id)}</div><h3 style="margin:4px 0 6px">${esc(k.title)}</h3><div class="kb-article">${md(k.body)}</div></div>
    </div>`;
    $("[data-kb-back]", host).addEventListener("click", () => {
      S.kbOpen = null;
      renderTools();
    });
    return;
  }
  host.innerHTML = `<div class="tool-body">
    <input type="search" id="kb-q" placeholder="Search the knowledge base" value="${esc(S.kbQuery)}" />
    <div class="result-list" id="kb-list"></div></div>`;
  const draw = () => {
    const q = S.kbQuery.trim().toLowerCase();
    const list = S.kb.filter((k) => !q || [k.id, k.title, k.body, ...k.tags].some((v) => v.toLowerCase().includes(q)));
    $("#kb-list").innerHTML = list.length
      ? list.map((k) => `<button class="result-row" data-kb="${esc(k.id)}"><span><span class="sub mono">${esc(k.id)}</span><br><b>${esc(k.title)}</b></span><span class="sub">→</span></button>`).join("")
      : `<p class="muted small">No articles match.</p>`;
    $$("[data-kb]").forEach((b) =>
      b.addEventListener("click", () => {
        S.kbOpen = b.dataset.kb;
        renderTools();
      }),
    );
  };
  $("#kb-q").addEventListener("input", (e) => {
    S.kbQuery = e.target.value;
    draw();
  });
  draw();
}

// ---- Senior tech (mentor)
function renderMentor(host) {
  const a = S.attempt;
  const hints = a.timeline.filter((e) => e.type === "hint").reverse();
  const left = a.maxHints - a.hintsUsed;
  host.innerHTML = `<div class="tool-body">
    <div class="box" style="background:var(--info-soft)">
      <b>Sam, Senior Technician</b>
      <p class="small" style="margin-top:4px">Stuck? Sam can nudge you in the right direction or answer an IT question. The caller can't see this. Each hint takes a few points off your score. <b>${left} of ${a.maxHints} left.</b></p>
    </div>
    <form id="hint-form" style="display:grid;gap:8px">
      <textarea name="question" maxlength="500" placeholder="Ask a question (optional), e.g. &quot;What should I check first?&quot;" ${left ? "" : "disabled"}></textarea>
      <button class="btn primary" type="submit" ${left && !S.hinting ? "" : "disabled"}>${S.hinting ? "Sam is thinking…" : "Ask Sam"}</button>
    </form>
    ${hints.map((h) => `<div class="hint-card">${h.question ? `<div class="who">You asked: ${esc(h.question)}</div>` : `<div class="who">Hint</div>`}${esc(h.answer)}</div>`).join("")}
  </div>`;
  $("#hint-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (S.hinting) return;
    S.hinting = true;
    const question = e.target.question.value.trim();
    renderTools();
    try {
      S.attempt = await call(`/api/attempts/${a.id}/hint`, { method: "POST", body: { question } });
    } catch (err) {
      toast(err.message, "error");
    } finally {
      S.hinting = false;
      if (S.tool === "mentor" && $("#tools")) renderTools();
    }
  });
}

// ------------------------------------------------------------ close ticket --
const NOTES_TEMPLATE = `Symptoms:
Cause:
Steps taken:
Outcome:
Follow-up:`;

async function closeTicket() {
  const a = S.attempt;
  const teams = S.meta.teams;
  const result = await modal({
    title: `Close ${a.lab.ticket.number}`,
    wide: true,
    confirmText: "Submit for grading",
    body: `
      <div class="outcome-opts">
        <label class="outcome-opt"><input type="radio" name="outcome" value="resolved" checked /><div><b>Resolved</b><span>The issue is fixed and confirmed with the caller.</span></div></label>
        <label class="outcome-opt"><input type="radio" name="outcome" value="escalated" /><div><b>Escalate</b><span>Hand off to another team with the details they need.</span></div></label>
      </div>
      <div class="field hidden" id="team-field"><label for="team">Escalate to</label>
        <select id="team" name="team"><option value="">Choose a team…</option>${teams.map((t) => `<option>${esc(t)}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label for="resolution" style="display:flex;justify-content:space-between;align-items:center">Resolution notes <button type="button" class="btn xs" id="tpl-btn">Insert template</button></label>
        <textarea id="resolution" name="resolution" rows="9" placeholder="Write it for the next technician: symptoms, cause, what you did, the outcome, and any follow-up."></textarea>
        <div class="hint-text">Your team lead grades these notes. Escalations need enough detail for the next team to act without calling the user back.</div>
      </div>
      <p class="muted small">Once you submit, the ticket is closed and graded. Make sure you've confirmed the result with the caller.</p>`,
    onOpen(form) {
      const sync = () => form.querySelector("#team-field").classList.toggle("hidden", form.outcome.value !== "escalated");
      $$("input[name=outcome]", form).forEach((r) => r.addEventListener("change", sync));
      form.querySelector("#tpl-btn").addEventListener("click", () => {
        const ta = form.querySelector("#resolution");
        ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${NOTES_TEMPLATE}` : NOTES_TEMPLATE;
        ta.focus();
      });
      form._validate = (d) => {
        if (d.outcome === "escalated" && !d.team) return "Choose the team you're escalating to.";
        if ((d.resolution || "").trim().length < 20) return "Write a few sentences of resolution notes first.";
        return null;
      };
    },
  });
  if (!result) return;

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `<div class="modal"><div class="grading"><div class="spinner"></div><h2>Your team lead is reviewing the ticket…</h2><p class="muted">Reading the conversation, your console actions, and your notes. This can take up to a minute.</p></div></div>`;
  document.body.append(overlay);
  try {
    S.attempt = await call(`/api/attempts/${a.id}/close`, { method: "POST", body: result });
    location.hash = `#/results/${a.id}`;
  } catch (err) {
    toast(err.message, "error", 6000);
  } finally {
    overlay.remove();
  }
}

// ----------------------------------------------------------------- results --
const CAT_LABEL = { troubleshooting: "Troubleshooting", resolution: "Resolution", security: "Security & policy", communication: "Communication", documentation: "Documentation" };

async function openResults(id) {
  const [a, me] = await Promise.all([S.attempt?.id === id && S.attempt.grade ? S.attempt : call(`/api/attempts/${id}`), call("/api/me")]);
  S.attempt = a;
  if (a.status !== "closed" || !a.grade) {
    location.hash = `#/ticket/${id}`;
    return;
  }
  const g = a.grade;
  const color = g.total >= 80 ? "var(--ok)" : g.total >= 60 ? "var(--warn)" : "var(--danger)";
  document.title = `${g.total}/100 · ${a.lab.title}`;
  const start = new Date(a.startedAt).getTime();
  const who = (e) => (e.type === "student" ? "You" : e.type === "caller" ? a.lab.callerName : e.type === "action" ? "Admin Center" : e.type === "hint" ? "Senior Tech" : "");
  const lineText = (e) => (e.type === "hint" ? `${e.question ? `Q: ${e.question}\n` : ""}${e.answer}` : e.text + (e.secret ? `  [${e.secret}]` : ""));

  app.innerHTML = `
  ${appbar(me.progress)}
  <main class="results">
    ${g.demo ? demoBanner() : ""}
    <section class="card score-hero">
      <div class="ring" style="--p:${g.total};--c:${color}"><div><b>${g.total}</b><span>out of 100</span></div></div>
      <div>
        <span class="ticket-no">${esc(a.lab.ticket.number)}</span> <span class="pill ${a.lab.difficulty}">${esc(a.lab.difficulty)}</span>
        <h1>${esc(g.verdict)}: ${esc(a.lab.title)}</h1>
        <p>${esc(g.summary)}</p>
        <p class="muted small" style="margin-top:8px">
          Closed as <b>${a.closure.outcome === "escalated" ? `Escalated to ${esc(a.closure.team)}` : "Resolved"}</b>
          ${g.hintPenalty ? ` · −${g.hintPenalty} for ${a.hintsUsed} hint${a.hintsUsed === 1 ? "" : "s"}` : ""}
          ${g.capped ? ` · capped at 40 because of a critical failure` : ""}
        </p>
        <div class="actions" style="margin-top:14px">
          <a class="btn primary" href="#/">Back to queue</a>
          <button class="btn" id="retry-btn">Try this ticket again</button>
        </div>
      </div>
    </section>

    ${g.criticalFailures.length ? `<section class="card panel" style="border-color:var(--danger)"><h2 style="color:var(--danger)">Critical failures</h2><ul class="bullets">${g.criticalFailures.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}

    <div class="grid2">
      <section class="card panel">
        <h2>Score breakdown</h2>
        ${Object.keys(CAT_LABEL)
          .map((k) => {
            const pct = Math.round((g.scores[k] / g.max[k]) * 100);
            return `<div class="cat-row"><div class="top"><span>${CAT_LABEL[k]}</span><span>${g.scores[k]} / ${g.max[k]}</span></div>
              <div class="meter ${pct < 50 ? "red" : ""}"><span style="width:${pct}%"></span></div><p>${esc(g.categoryNotes[k] || "")}</p></div>`;
          })
          .join("")}
      </section>
      <section class="card panel">
        <h2>What went well</h2>
        <ul class="bullets">${g.strengths.map((s) => `<li>${esc(s)}</li>`).join("") || "<li class='muted'>-</li>"}</ul>
        <h2 style="margin-top:18px">What to improve</h2>
        <ul class="bullets">${g.improvements.map((s) => `<li>${esc(s)}</li>`).join("") || "<li class='muted'>-</li>"}</ul>
      </section>
    </div>

    <section class="card panel"><h2>How an expert would handle it</h2><p>${esc(g.expertComparison)}</p></section>

    <div class="grid2">
      <section class="card panel">
        <h2>Objective checks</h2>
        ${g.checks.map((c) => `<div class="check-row ${c.passed ? "pass" : "fail"}"><span class="ic">${c.passed ? "✓" : "✗"}</span><span>${esc(c.label)}</span></div>`).join("")}
      </section>
      <section class="card panel">
        <h2>Your resolution notes</h2>
        <p style="white-space:pre-wrap;font-size:14px">${esc(a.closure.resolution)}</p>
      </section>
    </div>

    <section class="card panel">
      <details>
        <summary>Full ticket transcript (${a.timeline.length} entries)</summary>
        <div class="transcript">
          ${a.timeline
            .map(
              (e) => `<div class="t-line"><span class="t-time">${mmss(new Date(e.t) - start)}</span><span class="t-who">${esc(who(e))}</span><span class="t-text">${esc(lineText(e))}</span></div>`,
            )
            .join("")}
        </div>
      </details>
    </section>
  </main>`;
  bindAppbar();
  $("#retry-btn").addEventListener("click", () => startLab(a.labId, true));
}

boot();
