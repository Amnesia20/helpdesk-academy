// Settings window logic. Talks to the app only through window.hda (see settings-preload.cjs).
const $ = (id) => document.getElementById(id);
let saved = null;

const provider = () => document.querySelector("input[name=provider]:checked")?.value || "";

function showFields() {
  for (const el of document.querySelectorAll(".fields")) el.classList.toggle("on", el.dataset.for === provider());
  $("testBtn").disabled = !provider();
  $("testResult").textContent = "";
}

function values() {
  return {
    provider: provider(),
    groqKey: $("groqKey").value.trim(),
    anthropicKey: $("anthropicKey").value.trim(),
    ollamaUrl: $("ollamaUrl").value.trim(),
    ollamaModel: $("ollamaModel").value.trim(),
    classCode: $("classCode").value.trim(),
    instructorPassword: $("instructorPassword").value.trim(),
    share: $("share").checked,
  };
}

function randomString(length, abc) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}
const newPassword = () => randomString(16, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789");
const newClassCode = () => "HD-" + randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");

// The password stays hidden unless asked for, so it doesn't end up on a
// projector while the class code is being shown to students.
function showPassword(show) {
  $("instructorPassword").type = show ? "text" : "password";
  $("showPassword").textContent = show ? "Hide" : "Show";
  $("showPassword").setAttribute("aria-pressed", String(show));
}

// The class code only matters when other computers can connect.
function showShareFields() {
  const on = $("share").checked;
  $("shareFields").hidden = !on;
  if (on && !$("classCode").value.trim()) $("classCode").value = newClassCode();
}

async function load() {
  saved = await window.hda.get();
  if (!saved) return;
  const st = $("status");
  if (saved.aiStatus?.mode === "live") {
    st.textContent = "AI is on.";
    st.className = "status live";
  } else {
    // Say why (for example "The Groq key was rejected."), minus the "open Settings" advice.
    const why = (saved.aiStatus?.reason || "").replace(/\s*Open HelpDesk Academy > Settings to fix it\.?/, "").trim();
    st.textContent = !saved.aiStatus ? "" : why ? `AI is off (demo mode). ${why}` : "AI is off (demo mode). Choose an AI service below to turn it on.";
    st.className = "status demo";
  }
  const radio = document.querySelector(`input[name=provider][value="${saved.provider}"]`);
  if (radio) radio.checked = true;
  $("groqSaved").textContent = saved.groqKeyHint ? `Saved key: ${saved.groqKeyHint}. Leave blank to keep it.` : "";
  $("anthropicSaved").textContent = saved.anthropicKeyHint ? `Saved key: ${saved.anthropicKeyHint}. Leave blank to keep it.` : "";
  $("ollamaUrl").value = saved.ollamaUrl;
  $("ollamaModel").value = saved.ollamaModel;
  $("classCode").value = saved.classCode;
  $("instructorPassword").value = saved.instructorPassword;
  $("share").checked = saved.share;
  $("lan").textContent = saved.lanUrls.length ? `Students go to: ${saved.lanUrls.join("  or  ")}` : "";
  $("dataDir").textContent = `${saved.version ? `${saved.version} · ` : ""}Data: ${saved.dataDir}`;
  if (saved.platform === "linux") {
    $("firewallHint").textContent = "If this computer has a firewall turned on (for example ufw), allow incoming connections on the port in the address shown below.";
  }
  $("shortcutSection").hidden = !saved.shortcut?.available;
  $("desktopShortcut").checked = !!saved.shortcut?.exists;
  showFields();
  showShareFields();
}

async function setShortcut() {
  const box = $("desktopShortcut");
  const hint = $("shortcutHint");
  box.disabled = true;
  try {
    const r = await window.hda.shortcut(box.checked);
    box.checked = r.exists;
    hint.textContent = r.ok ? (r.exists ? "Added to your desktop." : "Removed from your desktop.") : r.message;
    hint.className = r.ok ? "hint" : "hint bad";
  } finally {
    box.disabled = false;
  }
}

document.querySelectorAll("input[name=provider]").forEach((r) => r.addEventListener("change", showFields));
document.querySelectorAll("[data-link]").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    window.hda.openExternal(a.dataset.link);
  }),
);
$("showPassword").addEventListener("click", () => showPassword($("instructorPassword").type === "password"));
$("newPassword").addEventListener("click", () => {
  $("instructorPassword").value = newPassword();
  showPassword(true); // a new password is only useful if you can read it
});
$("share").addEventListener("change", showShareFields);
$("desktopShortcut").addEventListener("change", setShortcut);
$("cancelBtn").addEventListener("click", () => window.hda.close());

$("testBtn").addEventListener("click", async () => {
  const out = $("testResult");
  out.className = "result";
  out.textContent = "Testing…";
  $("testBtn").disabled = true;
  try {
    const r = await window.hda.test(values());
    out.textContent = r.message;
    out.className = `result ${r.ok ? "ok" : "bad"}`;
  } finally {
    $("testBtn").disabled = false;
  }
});

$("saveBtn").addEventListener("click", async () => {
  const v = values();
  const err = $("error");
  err.textContent = "";
  if (v.provider === "groq" && !v.groqKey && !saved.groqKeyHint) return (err.textContent = "Paste your Groq key, or choose another AI service.");
  if (v.provider === "anthropic" && !v.anthropicKey && !saved.anthropicKeyHint) return (err.textContent = "Paste your Claude key, or choose another AI service.");
  if (v.instructorPassword.length < 8) return (err.textContent = "The instructor password needs at least 8 characters.");
  if (/["\r\n]/.test(Object.values(v).join(""))) return (err.textContent = "Remove quotation marks from the fields.");
  $("saveBtn").disabled = true;
  $("saveBtn").textContent = "Restarting…";
  await window.hda.save(v);
});

load();
