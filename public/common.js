// Small helpers shared by the student app and the instructor dashboard.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Can't reach the HelpDesk Academy server. Check your connection.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

// Minimal, safe markdown: escape first, then add a few formats.
export function md(text) {
  const lines = esc(text).split(/\r?\n/);
  const out = [];
  let list = null;
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const line of lines) {
    let m;
    if ((m = line.match(/^##\s+(.*)/))) {
      close();
      out.push(`<h4>${inline(m[1])}</h4>`);
    } else if ((m = line.match(/^\s*-\s+(.*)/))) {
      if (list !== "ul") {
        close();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) {
      if (list !== "ol") {
        close();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if (line.trim() === "") {
      close();
    } else {
      close();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join("");
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
export function fmtDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
export function timeAgo(iso) {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
export function mmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}

export function scoreClass(n) {
  if (n == null) return "";
  return n >= 80 ? "good" : n >= 60 ? "mid" : "low";
}

export function toast(message, kind = "info", ms = 3200) {
  let host = $(".toasts");
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    host.setAttribute("role", "status");
    document.body.append(host);
  }
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = message;
  host.append(el);
  setTimeout(() => el.remove(), ms);
}

// Promise-based modal. `body` is trusted HTML built by the caller (escape user data!).
// Resolves with the form's values (object) on confirm, or null on cancel.
export function modal({ title, body = "", confirmText = "OK", cancelText = "Cancel", danger = false, wide = false, hideCancel = false, onOpen }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `
      <form class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <h2>${esc(title)}</h2>
        <div class="modal-body">${body}</div>
        <div class="error-text" data-modal-error></div>
        <div class="modal-foot">
          ${hideCancel ? "" : `<button type="button" class="btn" data-cancel>${esc(cancelText)}</button>`}
          <button type="submit" class="btn ${danger ? "danger" : "primary"}">${esc(confirmText)}</button>
        </div>
      </form>`;
    const form = overlay.querySelector("form");
    const done = (val) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === "Escape") done(null);
    };
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) done(null);
    });
    form.querySelector("[data-cancel]")?.addEventListener("click", () => done(null));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = {};
      for (const el of form.elements) {
        if (!el.name) continue;
        if (el.type === "checkbox") data[el.name] = el.checked;
        else if (el.type === "radio") {
          if (el.checked) data[el.name] = el.value;
        } else data[el.name] = el.value;
      }
      if (form._validate) {
        const err = form._validate(data);
        if (err) {
          form.querySelector("[data-modal-error]").textContent = err;
          return;
        }
      }
      done(data);
    });
    document.body.append(overlay);
    onOpen?.(form);
    (form.querySelector("textarea, input:not([type=hidden]), select") || form.querySelector("button[type=submit]"))?.focus();
  });
}

// Desktop app only: its window adds window.hdaDesktop (electron/app-preload.cjs),
// so the top bar can offer a Settings button. Students in a web browser can't
// change the host computer's settings, so they never see it.
export const isDesktopApp = () => typeof window.hdaDesktop?.openSettings === "function";
const GEAR = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
export const settingsButton = (label = "Settings") =>
  isDesktopApp()
    ? `<button class="btn sm settings-btn" type="button" data-open-settings title="AI service, instructor password, sharing and shortcut (Ctrl+,)">${GEAR}<span>${label}</span></button>`
    : "";
// One listener for every Settings button, wherever it's drawn.
document.addEventListener("click", (e) => {
  if (e.target.closest?.("[data-open-settings]")) window.hdaDesktop?.openSettings();
});

export const LOGO = `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0f766e"/><path d="M9 17v-2a7 7 0 0 1 14 0v2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><rect x="7" y="16" width="4.5" height="7" rx="1.6" fill="#fff"/><rect x="20.5" y="16" width="4.5" height="7" rx="1.6" fill="#fff"/><path d="M22.8 23c0 2-2.3 3.2-5.3 3.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="16.6" cy="26.2" r="1.4" fill="#5eead4"/></svg>`;
