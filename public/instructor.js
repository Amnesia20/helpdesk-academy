import { $, $$, esc, api, fmtDateTime, timeAgo, mmss, scoreClass, toast, modal, LOGO, settingsButton } from "./common.js";

const session = {
  get() {
    try {
      return sessionStorage.getItem("hda_instructor");
    } catch {
      return null;
    }
  },
  set(v) {
    try {
      v ? sessionStorage.setItem("hda_instructor", v) : sessionStorage.removeItem("hda_instructor");
    } catch {}
  },
};

const S = { token: session.get(), data: null, refresh: null, drawer: null };
const app = $("#app");
const CAT_LABEL = { troubleshooting: "Troubleshoot", resolution: "Resolution", security: "Security", communication: "Comms", documentation: "Docs" };

async function call(path, opts = {}) {
  try {
    return await api(path, { ...opts, token: S.token });
  } catch (err) {
    if (err.status === 401) {
      S.token = null;
      session.set(null);
      renderLogin("Please sign in again.");
    }
    throw err;
  }
}

function renderLogin(msg = "") {
  clearInterval(S.refresh);
  app.innerHTML = `
  <div class="login-wrap" style="grid-template-columns:minmax(320px,420px)">
    <div class="card login-card">
      <div class="brand">${LOGO}<div>HelpDesk Academy<small>Instructor console</small></div></div>
      <h1>Instructor sign-in</h1>
      <p class="muted">The password is shown in the server window when it starts, or set INSTRUCTOR_PASSWORD in .env.</p>
      <form id="f" style="margin-top:18px">
        <div class="field"><label for="pw">Password</label><input id="pw" name="password" type="password" required /></div>
        <button class="btn primary" style="width:100%;padding:10px">Sign in</button>
        <div class="error-text" id="err">${esc(msg)}</div>
      </form>
      <p class="small" style="margin-top:14px"><a href="/">← Student site</a></p>
    </div>
  </div>`;
  $("#f").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const res = await api("/api/instructor/login", { method: "POST", body: { password: e.target.password.value } });
      S.token = res.token;
      session.set(res.token);
      load();
    } catch (err) {
      $("#err").textContent = err.message;
    }
  });
  $("#pw").focus();
}

async function load() {
  try {
    S.data = await call("/api/instructor/overview");
    render();
    clearInterval(S.refresh);
    S.refresh = setInterval(async () => {
      if (document.hidden || S.drawer) return;
      try {
        S.data = await call("/api/instructor/overview");
        render();
      } catch {}
    }, 20000);
  } catch (err) {
    if (err.status !== 401) toast(err.message, "error");
  }
}

const heat = (pct) => {
  if (pct == null) return `<span class="heat muted">-</span>`;
  const bg = pct >= 80 ? "var(--easy-soft)" : pct >= 60 ? "var(--medium-soft)" : "var(--danger-soft)";
  const fg = pct >= 80 ? "var(--ok)" : pct >= 60 ? "var(--warn)" : "var(--danger)";
  return `<span class="heat" style="background:${bg};color:${fg}">${pct}%</span>`;
};

function render() {
  const d = S.data;
  const graded = d.labs.reduce((s, l) => s + l.attempts, 0);
  const avgs = d.students.filter((s) => s.avgBest != null).map((s) => s.avgBest);
  const classAvg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
  const working = d.students.filter((s) => s.workingOn).length;
  app.innerHTML = `
  <header class="appbar">
    <div class="brand">${LOGO}<div>HelpDesk Academy<small>Instructor console</small></div></div>
    <div class="spacer"></div>
    <span class="small" style="opacity:.8">Auto-refreshes every 20s</span>
    <button class="btn sm" id="refresh">Refresh</button>
    <button class="btn sm" id="csv">Export CSV</button>
    ${settingsButton()}
    <button class="btn sm" id="out">Sign out</button>
  </header>
  <main class="inst">
    ${d.aiMode !== "live" ? `<div class="banner"><strong>Demo mode.</strong><span>${esc(d.aiReason)} Students can click around, but callers and grades aren't real until the AI is on.</span>${settingsButton("Open Settings")}</div>` : ""}
    <div class="stat-row">
      <div class="card stat-card"><b>${d.students.length}</b><span>Students</span></div>
      <div class="card stat-card"><b>${working}</b><span>Working a ticket now</span></div>
      <div class="card stat-card"><b>${graded}</b><span>Tickets graded</span></div>
      <div class="card stat-card"><b>${classAvg ?? "-"}</b><span>Class avg (best scores)</span></div>
      <div class="card stat-card"><b style="font-size:16px">${d.classCode ? esc(d.classCode) : "None"}</b><span>Class code</span></div>
      <div class="card stat-card" title="${esc((d.aiModels?.caller || []).join(", "))}"><b style="font-size:16px">${d.aiMode === "live" ? esc(d.aiProvider) : "Demo mode"}</b><span>AI service</span></div>
    </div>

    <section class="card">
      <div style="padding:14px 16px 6px"><h2 style="font-size:16px">Students</h2><p class="muted small">Click a student to see every attempt and full transcripts.</p></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Student</th><th>Rank</th><th>XP</th><th>Labs done</th><th>Avg best</th><th>Graded</th><th>Working on</th><th>Last active</th></tr></thead>
          <tbody>
            ${
              d.students.length
                ? d.students
                    .map(
                      (s) => `<tr class="click" data-student="${esc(s.id)}">
                <td><b>${esc(s.displayName)}</b><br><span class="muted small mono">${esc(s.username)}</span></td>
                <td>${esc(s.rank)}</td><td>${s.xp}</td><td>${s.completed} / ${d.labs.length}</td>
                <td><span class="score-badge ${scoreClass(s.avgBest)}">${s.avgBest ?? "-"}</span></td><td>${s.attempts}</td>
                <td>${s.workingOn ? `<span class="pill info">${esc(s.workingOn)}</span>` : `<span class="muted">-</span>`}</td>
                <td class="muted small">${timeAgo(s.lastActive)}</td></tr>`,
                    )
                    .join("")
                : `<tr><td colspan="8" class="muted">No students yet. Share the server address with your class.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div style="padding:14px 16px 6px"><h2 style="font-size:16px">Labs</h2><p class="muted small">Average of all graded attempts. Category columns show the average percentage, so low cells are the skills to reteach.</p></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Lab</th><th>Level</th><th>Students</th><th>Attempts</th><th>Avg score</th>${Object.values(CAT_LABEL).map((c) => `<th>${c}</th>`).join("")}</tr></thead>
          <tbody>
            ${d.labs
              .map(
                (l) => `<tr><td><b>${esc(l.title)}</b></td><td><span class="pill ${l.difficulty}">${esc(l.difficulty)}</span></td><td>${l.students}</td><td>${l.attempts}</td>
              <td><span class="score-badge ${scoreClass(l.avg)}">${l.avg ?? "-"}</span></td>${Object.keys(CAT_LABEL).map((k) => `<td>${heat(l.categoryPct[k])}</td>`).join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  </main>`;
  $("#refresh").addEventListener("click", load);
  $("#out").addEventListener("click", () => {
    S.token = null;
    session.set(null);
    renderLogin();
  });
  $("#csv").addEventListener("click", downloadCsv);
  $$("[data-student]").forEach((r) => r.addEventListener("click", () => openStudent(r.dataset.student)));
}

async function downloadCsv() {
  try {
    const res = await fetch("/api/instructor/export.csv", { headers: { Authorization: `Bearer ${S.token}` } });
    if (!res.ok) throw new Error("Export failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `helpdesk-academy-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    toast(err.message, "error");
  }
}

// ----------------------------------------------------------------- drawer --
function openDrawer(html) {
  closeDrawer();
  const el = document.createElement("div");
  el.innerHTML = `<div class="drawer-backdrop" data-close></div><aside class="drawer" role="dialog" aria-modal="true">${html}</aside>`;
  document.body.append(el);
  S.drawer = el;
  $$("[data-close]", el).forEach((b) => b.addEventListener("click", closeDrawer));
  document.addEventListener("keydown", escClose);
  return el;
}
function closeDrawer() {
  S.drawer?.remove();
  S.drawer = null;
  document.removeEventListener("keydown", escClose);
}
const escClose = (e) => e.key === "Escape" && closeDrawer();

async function openStudent(id) {
  let data;
  try {
    data = await call(`/api/instructor/students/${id}`);
  } catch (err) {
    return toast(err.message, "error");
  }
  const s = data.student;
  const labs = S.data.labs;
  const el = openDrawer(`
    <div class="drawer-head">
      <div style="flex:1"><h2 style="font-size:18px">${esc(s.displayName)}</h2><span class="muted small mono">${esc(s.username)}</span> · <span class="small">${esc(s.rank)} · ${s.xp} XP</span></div>
      <button class="btn sm" id="pin">Reset PIN</button>
      <button class="btn sm danger" id="del">Delete</button>
      <button class="btn sm" data-close>Close</button>
    </div>
    <div class="drawer-body">
      <section>
        <div class="section-label">Best score per lab</div>
        <div class="lab-grid">
          ${labs
            .map((l) => {
              const p = s.perLab[l.id];
              return `<div class="lab-cell"><span class="pill ${l.difficulty}" style="font-size:10px">${esc(l.difficulty)}</span><div class="small" style="margin:4px 0 2px">${esc(l.title)}</div>
                <b class="score-badge ${scoreClass(p.best)}">${p.best ?? "-"}</b>${p.activeAttemptId ? ` <span class="pill info" style="font-size:10px">active</span>` : ""}</div>`;
            })
            .join("")}
        </div>
      </section>
      <section class="card">
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Lab</th><th>Status</th><th>Score</th><th>Hints</th><th>Msgs</th><th>Started</th></tr></thead>
            <tbody>
              ${
                data.attempts.length
                  ? data.attempts
                      .map(
                        (a) => `<tr class="click" data-attempt="${esc(a.id)}"><td><b>${esc(a.title)}</b> <span class="pill ${a.difficulty}">${esc(a.difficulty)}</span></td>
                  <td>${a.status === "closed" ? esc(a.verdict || "closed") : `<span class="pill info">${esc(a.status)}</span>`}</td>
                  <td><span class="score-badge ${scoreClass(a.total)}">${a.total ?? "-"}</span></td><td>${a.hintsUsed}</td><td>${a.messages}</td><td class="small">${fmtDateTime(a.startedAt)}</td></tr>`,
                      )
                      .join("")
                  : `<tr><td colspan="6" class="muted">No attempts yet.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>`);
  $$("[data-attempt]", el).forEach((r) => r.addEventListener("click", () => openAttempt(r.dataset.attempt, id)));
  $("#pin", el).addEventListener("click", async () => {
    const res = await modal({
      title: `Reset PIN for ${s.displayName}`,
      body: `<div class="field"><label for="np">New PIN (4-8 digits)</label><input id="np" name="pin" type="text" inputmode="numeric" required /></div><p class="muted small">They'll be signed out and must use the new PIN.</p>`,
      confirmText: "Set PIN",
    });
    if (!res) return;
    try {
      await call(`/api/instructor/students/${id}/reset-pin`, { method: "POST", body: { pin: res.pin } });
      toast("PIN updated.");
    } catch (err) {
      toast(err.message, "error");
    }
  });
  $("#del", el).addEventListener("click", async () => {
    const ok = await modal({
      title: `Delete ${s.displayName}?`,
      body: `<p>This permanently deletes the student and all ${data.attempts.length} of their attempts. It can't be undone.</p>`,
      confirmText: "Delete student",
      danger: true,
    });
    if (!ok) return;
    try {
      await call(`/api/instructor/students/${id}`, { method: "DELETE" });
      closeDrawer();
      toast("Student deleted.");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  });
}

async function openAttempt(id, studentId) {
  let a;
  try {
    a = await call(`/api/instructor/attempts/${id}`);
  } catch (err) {
    return toast(err.message, "error");
  }
  const g = a.grade;
  const start = new Date(a.startedAt).getTime();
  const who = { student: "Student", caller: a.lab.callerName, action: "Console", view: "Looked up", hint: "Senior Tech", system: "System" };
  const el = openDrawer(`
    <div class="drawer-head">
      <button class="btn sm ghost" id="back">← ${esc(a.student.displayName)}</button>
      <div style="flex:1"><b>${esc(a.lab.title)}</b> <span class="pill ${a.lab.difficulty}">${esc(a.lab.difficulty)}</span></div>
      <button class="btn sm" data-close>Close</button>
    </div>
    <div class="drawer-body">
      <div class="secret-panel"><b>Instructor only: what was really going on</b><p style="margin-top:6px">${esc(a.lab.secret)}</p>
        <p style="margin-top:8px"><b>Expert path:</b> ${esc(a.lab.expert)}</p><p style="margin-top:6px"><b>Expected outcome:</b> ${esc(a.lab.outcome)}</p></div>
      ${
        g
          ? `<section class="card panel">
        <h2>${g.total}/100 · ${esc(g.verdict)}${g.demo ? ` <span class="pill warn">demo grade</span>` : ""}</h2>
        <p>${esc(g.summary)}</p>
        <div class="stat-row" style="margin-top:12px">${Object.keys(CAT_LABEL)
          .map((k) => `<div class="box"><b>${g.scores[k]}/${g.max[k]}</b><div class="small muted">${CAT_LABEL[k]}</div><div class="small" style="margin-top:4px">${esc(g.categoryNotes?.[k] || "")}</div></div>`)
          .join("")}</div>
        ${g.criticalFailures.length ? `<div class="flag red" style="margin-top:12px"><b>Critical:</b> ${g.criticalFailures.map(esc).join(" · ")}</div>` : ""}
        <div class="grid2" style="margin-top:12px">
          <div><b class="small">Strengths</b><ul class="bullets">${g.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div><b class="small">Improvements</b><ul class="bullets">${g.improvements.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        </div>
        <div style="margin-top:12px"><b class="small">Checks</b>${g.checks.map((c) => `<div class="check-row ${c.passed ? "pass" : "fail"}"><span class="ic">${c.passed ? "✓" : "✗"}</span>${esc(c.label)}</div>`).join("")}</div>
      </section>`
          : `<div class="banner"><span>This attempt is <b>${esc(a.status)}</b> and hasn't been graded.</span></div>`
      }
      ${a.closure ? `<section class="card panel"><h2>Closure: ${a.closure.outcome === "escalated" ? `Escalated to ${esc(a.closure.team)}` : "Resolved"}</h2><p style="white-space:pre-wrap">${esc(a.closure.resolution)}</p></section>` : ""}
      <section class="card panel"><h2>Work notes</h2><p style="white-space:pre-wrap" class="${a.notes ? "" : "muted"}">${esc(a.notes || "(none)")}</p></section>
      <section class="card panel"><h2>Timeline</h2>
        <div class="transcript">${a.timeline
          .map(
            (e) => `<div class="t-line"><span class="t-time">${mmss(new Date(e.t) - start)}</span><span class="t-who">${esc(who[e.type] || e.type)}</span>
            <span class="t-text ${e.type === "view" ? "muted" : ""}">${esc(e.type === "hint" ? `${e.question ? `Q: ${e.question}\n` : ""}${e.answer}` : e.text)}${e.secret ? ` <code>${esc(e.secret)}</code>` : ""}${e.type === "caller" && e.frustration ? ` <span class="muted small">(mood ${e.frustration}/5${e.resolved ? ", says fixed" : ""})</span>` : ""}</span></div>`,
          )
          .join("")}</div>
      </section>
    </div>`);
  $("#back", el).addEventListener("click", () => openStudent(studentId));
}

if (S.token) load();
else renderLogin();
