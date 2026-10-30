// The simulated "Brightline Admin Center". Each action changes the attempt's
// copy of the directory and is written to the timeline, which both the AI
// caller (for consequences) and the AI grader (for scoring) read.
import crypto from "node:crypto";
import { findUser, findDevice } from "../labs/directory.js";

const WORDS = ["Copper", "Falcon", "Harbor", "Maple", "Signal", "Granite", "Cobalt", "Willow", "Summit", "Lantern", "Orbit", "Prairie", "Cedar", "Beacon"];
function tempPassword() {
  const pick = () => WORDS[crypto.randomInt(WORDS.length)];
  return `${pick()}-${pick()}-${crypto.randomInt(1000, 9999)}!`;
}

export function logEvent(attempt, entry) {
  attempt.timeline.push({ t: new Date().toISOString(), ...entry });
}

function needUser(env, username) {
  const u = findUser(env, username);
  if (!u) throw new ActionError(`No user "${username}" in the directory.`);
  return u;
}

export class ActionError extends Error {}

const describe = (u) => `${u.username} (${u.displayName}, ${u.department})`;

const handlers = {
  view_user(attempt, { username }) {
    const u = needUser(attempt.env, username);
    const last = attempt.timeline.at(-1);
    if (!(last?.type === "view" && last.target === username)) {
      logEvent(attempt, { type: "view", action: "view_user", target: username, text: `Opened user record ${describe(u)}` });
    }
    return { message: null };
  },

  view_device(attempt, { hostname }) {
    const d = findDevice(attempt.env, hostname);
    if (!d) throw new ActionError(`No device "${hostname}".`);
    const last = attempt.timeline.at(-1);
    if (!(last?.type === "view" && last.target === hostname)) {
      logEvent(attempt, { type: "view", action: "view_device", target: hostname, text: `Opened device record ${hostname} (assigned to ${d.assignedTo})` });
    }
    return { message: null };
  },

  unlock_account(attempt, { username }) {
    const u = needUser(attempt.env, username);
    const wasLocked = u.locked;
    u.locked = false;
    u.badPwdCount = 0;
    logEvent(attempt, { type: "action", action: "unlock_account", target: username, text: `Unlocked account ${describe(u)}${wasLocked ? "" : " (it was not locked)"}` });
    return { message: wasLocked ? `${u.displayName}'s account is unlocked.` : `${u.displayName}'s account wasn't locked. Nothing changed.` };
  },

  reset_password(attempt, { username, mustChange = true }) {
    const u = needUser(attempt.env, username);
    const pw = tempPassword();
    u.passwordLastSet = new Date().toISOString().slice(0, 10);
    u.passwordExpired = false;
    u.mustChangeAtNextLogon = !!mustChange;
    u.tempPassword = pw;
    u.locked = false;
    u.badPwdCount = 0;
    logEvent(attempt, {
      type: "action",
      action: "reset_password",
      target: username,
      text: `Reset password for ${describe(u)}. Temporary password issued. "User must change password at next logon" was ${mustChange ? "CHECKED" : "UNCHECKED"}.`,
      secret: pw,
    });
    return { message: `Password reset for ${u.displayName}. Give the user this temporary password:`, secret: pw };
  },

  revoke_sessions(attempt, { username }) {
    const u = needUser(attempt.env, username);
    u.activeSessions = 0;
    u.sessionsRevokedAt = new Date().toISOString();
    logEvent(attempt, { type: "action", action: "revoke_sessions", target: username, text: `Revoked all sign-in sessions and refresh tokens for ${describe(u)}` });
    return { message: `All of ${u.displayName}'s sessions were signed out on every device.` };
  },

  reset_mfa(attempt, { username }) {
    const u = needUser(attempt.env, username);
    const removed = u.mfa.map((m) => `${m.type} on ${m.device}`).join(", ") || "none";
    u.mfa = [];
    u.mfaReregisterRequired = true;
    logEvent(attempt, { type: "action", action: "reset_mfa", target: username, text: `Reset MFA for ${describe(u)}: removed all methods (${removed}); user must re-register at next sign-in` });
    return { message: `MFA reset. ${u.displayName} will be asked to set up MFA again at their next sign-in.` };
  },

  remove_mfa_method(attempt, { username, methodId }) {
    const u = needUser(attempt.env, username);
    const m = u.mfa.find((x) => x.id === methodId);
    if (!m) throw new ActionError("That MFA method no longer exists.");
    u.mfa = u.mfa.filter((x) => x.id !== methodId);
    logEvent(attempt, { type: "action", action: "remove_mfa_method", target: username, text: `Removed MFA method "${m.type} on ${m.device}" (added ${m.added}) from ${describe(u)}` });
    return { message: `Removed ${m.type} (${m.device}).` };
  },

  add_group(attempt, { username, group }) {
    const u = needUser(attempt.env, username);
    if (!attempt.env.groups.some((g) => g.name === group)) throw new ActionError(`No group named ${group}.`);
    if (u.groups.includes(group)) return { message: `${u.displayName} is already in ${group}.` };
    u.groups.push(group);
    logEvent(attempt, { type: "action", action: "add_group", target: username, group, text: `Added ${describe(u)} to group ${group}` });
    return { message: `${u.displayName} added to ${group}. Group changes take effect the next time the user signs in.` };
  },

  remove_group(attempt, { username, group }) {
    const u = needUser(attempt.env, username);
    if (!u.groups.includes(group)) return { message: `${u.displayName} isn't in ${group}.` };
    u.groups = u.groups.filter((g) => g !== group);
    logEvent(attempt, { type: "action", action: "remove_group", target: username, group, text: `Removed ${describe(u)} from group ${group}` });
    return { message: `${u.displayName} removed from ${group}.` };
  },

  disable_inbox_rule(attempt, { username, ruleId }) {
    const u = needUser(attempt.env, username);
    const r = u.mailbox.rules.find((x) => x.id === ruleId);
    if (!r) throw new ActionError("Rule not found.");
    r.enabled = false;
    logEvent(attempt, { type: "action", action: "disable_inbox_rule", target: username, text: `Disabled inbox rule "${r.name}" on ${u.username}'s mailbox (rule kept for investigation)` });
    return { message: `Rule "${r.name}" disabled.` };
  },

  delete_inbox_rule(attempt, { username, ruleId }) {
    const u = needUser(attempt.env, username);
    const r = u.mailbox.rules.find((x) => x.id === ruleId);
    if (!r) throw new ActionError("Rule not found.");
    u.mailbox.rules = u.mailbox.rules.filter((x) => x.id !== ruleId);
    logEvent(attempt, { type: "action", action: "delete_inbox_rule", target: username, text: `DELETED inbox rule "${r.name}" from ${u.username}'s mailbox (rule no longer available for investigation)` });
    return { message: `Rule "${r.name}" deleted.` };
  },

  remove_forwarding(attempt, { username }) {
    const u = needUser(attempt.env, username);
    const was = u.mailbox.forwarding;
    u.mailbox.forwarding = null;
    logEvent(attempt, { type: "action", action: "remove_forwarding", target: username, text: `Removed mailbox-level forwarding on ${u.username} (was: ${was || "none"})` });
    return { message: was ? `Forwarding to ${was} removed.` : "No forwarding was set." };
  },

  disable_account(attempt, { username }) {
    const u = needUser(attempt.env, username);
    u.enabled = false;
    logEvent(attempt, { type: "action", action: "disable_account", target: username, text: `DISABLED account ${describe(u)}` });
    return { message: `${u.displayName}'s account is disabled. They can't sign in anywhere.` };
  },

  enable_account(attempt, { username }) {
    const u = needUser(attempt.env, username);
    u.enabled = true;
    logEvent(attempt, { type: "action", action: "enable_account", target: username, text: `Enabled account ${describe(u)}` });
    return { message: `${u.displayName}'s account is enabled.` };
  },

  callback(attempt, { username }, lab) {
    const u = needUser(attempt.env, username);
    const scripted = attempt.env.callbacks?.[username];
    let result;
    if (scripted) result = scripted;
    else if (username === lab.caller.username) result = `${u.displayName} answered at ${u.phone} (the number on file) and confirmed they are the person who contacted the help desk about this ticket.`;
    else if (username === findUser(attempt.env, lab.caller.username)?.manager)
      result = `${u.displayName} answered at ${u.phone}. They confirmed ${lab.caller.name} works for them and said it's fine to help ${lab.caller.name.split(" ")[0]} with this.`;
    else result = `${u.displayName} answered at ${u.phone}. They don't know anything about this ticket and weren't expecting a call.`;
    logEvent(attempt, { type: "action", action: "callback", target: username, text: `Placed a verification callback to ${u.displayName} at ${u.phone} (number on file). Result: ${result}` });
    return { message: result, callback: true };
  },

  reveal_bitlocker(attempt, { hostname, keyId }) {
    const d = findDevice(attempt.env, hostname);
    if (!d) throw new ActionError(`No device "${hostname}".`);
    const k = d.bitlocker.find((x) => x.keyId === keyId);
    if (!k) throw new ActionError("Key not found.");
    attempt.revealedKeys = [...new Set([...(attempt.revealedKeys || []), keyId])];
    logEvent(attempt, { type: "action", action: "reveal_bitlocker", target: hostname, text: `Revealed BitLocker recovery key for ${hostname} (Key ID ${keyId}, assigned to ${d.assignedTo}). Audited event.`, secret: k.recoveryKey });
    return { message: `Recovery key for ${hostname} (this lookup is audited):`, secret: k.recoveryKey };
  },
};

export function runAction(attempt, lab, body) {
  const handler = handlers[body?.type];
  if (!handler) throw new ActionError("Unknown action.");
  return handler(attempt, body, lab);
}

// What the browser is allowed to see: hide scripted callback answers and
// recovery keys the student hasn't (audibly) revealed yet.
export function publicEnv(attempt) {
  const env = structuredClone(attempt.env);
  delete env.callbacks;
  delete env.consoleNotes;
  const revealed = new Set(attempt.revealedKeys || []);
  for (const d of env.devices) {
    for (const k of d.bitlocker) if (!revealed.has(k.keyId)) k.recoveryKey = null;
  }
  for (const u of env.users) delete u.tempPassword;
  return env;
}

// Objective facts about what the tech did, handy for checks in lab files.
export const did = (timeline, action, target) =>
  timeline.some((e) => e.type === "action" && e.action === action && (!target || e.target === target));

export const firstIndex = (timeline, pred) => timeline.findIndex(pred);
