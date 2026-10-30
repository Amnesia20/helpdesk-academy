import easy from "./easy.js";
import medium from "./medium.js";
import hard from "./hard.js";
import kb from "./kb.js";

export const LABS = [...easy, ...medium, ...hard];
export const KB = kb;

export const DIFFICULTY = {
  easy: { label: "Easy", tier: "Tier 1", multiplier: 1 },
  medium: { label: "Medium", tier: "Tier 1.5", multiplier: 2 },
  hard: { label: "Hard", tier: "Tier 2", multiplier: 3 },
};

export const ESCALATION_TEAMS = [
  "Tier 2 Desktop Support",
  "Network Operations",
  "Security Operations (SOC)",
  "Field Services",
  "Applications Team",
  "Identity & Access Management",
];

const byId = new Map(LABS.map((l) => [l.id, l]));
export const getLab = (id) => byId.get(id);

// What students may see about a lab: never the secret, behavior, or expert path.
export function publicLab(lab) {
  return {
    id: lab.id,
    difficulty: lab.difficulty,
    title: lab.title,
    category: lab.category,
    skills: lab.skills,
    estMinutes: lab.estMinutes,
    ticket: lab.ticket,
    callerName: lab.caller.name,
  };
}

// Sanity check at startup so a typo in a lab file fails loudly.
for (const lab of LABS) {
  for (const key of ["id", "difficulty", "title", "ticket", "caller", "secret", "expert", "outcome", "setup", "facts", "checks", "hints"]) {
    if (!(key in lab)) throw new Error(`Lab ${lab.id || "(no id)"} is missing "${key}"`);
  }
  if (!DIFFICULTY[lab.difficulty]) throw new Error(`Lab ${lab.id} has unknown difficulty ${lab.difficulty}`);
}
if (byId.size !== LABS.length) throw new Error("Duplicate lab ids");
