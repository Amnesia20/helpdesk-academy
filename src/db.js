// Tiny JSON-file database. Fine for a classroom (dozens of students);
// swap for SQLite if you ever run this for hundreds of people at once.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "./config.js";

const DB_FILE = path.join(DATA_DIR, "db.json");

const empty = () => ({ students: {}, sessions: {}, attempts: {} });

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) return empty();
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch (err) {
    const backup = DB_FILE + ".corrupt-" + Date.now();
    fs.copyFileSync(DB_FILE, backup);
    console.error(`db.json was unreadable (${err.message}); saved a copy to ${backup} and started fresh.`);
    return empty();
  }
}

export const db = load();

let saveTimer = null;
export function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(flush, 250);
}

export function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

export const newId = (prefix = "") => prefix + crypto.randomBytes(8).toString("hex");

export function hashPin(pin, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(pin), salt, 32).toString("hex");
  return { salt, hash };
}

export function checkPin(pin, student) {
  const { hash } = hashPin(pin, student.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(student.pinHash, "hex"));
}

process.on("exit", () => {
  if (saveTimer) flush();
});
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (saveTimer) flush();
    process.exit(0);
  });
}
