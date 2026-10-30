// The fictional company every lab takes place in: Brightline Logistics.
// buildDirectory() returns a fresh copy for each attempt so students can
// change it (unlock accounts, reset MFA...) without affecting anyone else.
// All names, numbers and addresses are made up. Phone numbers use the
// reserved 555-01xx range and public IPs use documentation ranges.

const DAY = 86400000;
export const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
export const daysAhead = (n) => daysAgo(-n);
export const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();

export const GROUPS = [
  { name: "SG-AllStaff", description: "Every Brightline employee", owner: "IT" },
  { name: "SG-VPN-Users", description: "Allowed to use SecureLink VPN", owner: "IT" },
  { name: "SG-Finance-RW", description: "Read/write on \\\\bl-fs01\\Finance", owner: "tom.alvarez" },
  { name: "SG-Finance-RO", description: "Read-only on \\\\bl-fs01\\Finance", owner: "tom.alvarez" },
  { name: "SG-Payroll-RW", description: "Read/write on \\\\bl-fs01\\Payroll (restricted)", owner: "diane.whitaker" },
  { name: "SG-HR-RW", description: "Read/write on \\\\bl-fs01\\HR", owner: "angela.price" },
  { name: "SG-Sales-RW", description: "Read/write on \\\\bl-fs01\\Sales", owner: "laura.bennett" },
  { name: "SG-Marketing-RW", description: "Read/write on \\\\bl-fs01\\Marketing", owner: "laura.bennett" },
  { name: "SG-Dispatch-RW", description: "Read/write on \\\\bl-fs01\\Dispatch", owner: "marcus.lee" },
  { name: "SG-Executives", description: "Executive team distribution + boardroom resources", owner: "james.harlow" },
  { name: "SG-IT-Admins", description: "Domain administrators (highly restricted)", owner: "IT" },
  { name: "APP-AcmeReports", description: "AcmeReports finance reporting add-in", owner: "tom.alvarez" },
];

function user(u) {
  return {
    enabled: true,
    locked: false,
    badPwdCount: 0,
    passwordLastSet: daysAgo(40),
    passwordExpires: daysAhead(50),
    passwordExpired: false,
    groups: ["SG-AllStaff"],
    mfa: [{ id: "m1", type: "Authenticator app (push)", device: "iPhone", added: daysAgo(400) }],
    mailbox: { usedGB: 12.4, quotaGB: 50, forwarding: null, rules: [] },
    signIns: [{ time: minutesAgo(180), app: "Windows sign-in", location: "Denver, US", ip: "10.20.4.51", result: "Success" }],
    activeSessions: 2,
    vip: false,
    flags: [],
    ...u,
  };
}

export function buildDirectory() {
  const users = [
    user({ username: "james.harlow", displayName: "James Harlow", title: "Chief Executive Officer", department: "Executive", office: "Denver HQ - 5th floor", manager: null, employeeId: "10001", phone: "555-0101", vip: true, groups: ["SG-AllStaff", "SG-Executives", "SG-VPN-Users"], flags: ["VIP - callback verification required for any account change"] }),
    user({ username: "diane.whitaker", displayName: "Diane Whitaker", title: "Chief Financial Officer", department: "Finance", office: "Denver HQ - 5th floor", manager: "james.harlow", employeeId: "10007", phone: "555-0199", vip: true, groups: ["SG-AllStaff", "SG-Executives", "SG-Finance-RW", "SG-Payroll-RW", "SG-VPN-Users"], mfa: [{ id: "m1", type: "Authenticator app (push)", device: "iPhone 16 Pro", added: daysAgo(210) }], flags: ["VIP - callback verification required for any account change"] }),
    user({ username: "rebecca.stone", displayName: "Rebecca Stone", title: "Executive Assistant to the CEO", department: "Executive", office: "Denver HQ - 5th floor", manager: "james.harlow", employeeId: "10144", phone: "555-0117", groups: ["SG-AllStaff", "SG-Executives"] }),
    user({ username: "laura.bennett", displayName: "Laura Bennett", title: "Director of Sales", department: "Sales", office: "Denver HQ - 3rd floor", manager: "james.harlow", employeeId: "10022", phone: "555-0122", groups: ["SG-AllStaff", "SG-Sales-RW", "SG-Marketing-RW", "SG-VPN-Users"] }),
    user({ username: "michael.chen", displayName: "Michael Chen", title: "Account Executive", department: "Sales", office: "Denver HQ - 3rd floor", manager: "laura.bennett", employeeId: "10442", phone: "555-0142", groups: ["SG-AllStaff", "SG-Sales-RW"] }),
    user({ username: "michael.chen2", displayName: "Michael Chen", title: "Systems Engineer", department: "IT", office: "Denver HQ - 2nd floor", manager: "kevin.osei", employeeId: "10871", phone: "555-0187", groups: ["SG-AllStaff", "SG-IT-Admins", "SG-VPN-Users"], flags: ["Privileged account"] }),
    user({ username: "kevin.osei", displayName: "Kevin Osei", title: "IT Manager", department: "IT", office: "Denver HQ - 2nd floor", manager: "james.harlow", employeeId: "10031", phone: "555-0131", groups: ["SG-AllStaff", "SG-IT-Admins", "SG-VPN-Users"] }),
    user({ username: "tom.alvarez", displayName: "Tom Alvarez", title: "Finance Manager", department: "Finance", office: "Denver HQ - 4th floor", manager: "diane.whitaker", employeeId: "10058", phone: "555-0158", groups: ["SG-AllStaff", "SG-Finance-RW", "SG-Payroll-RW", "APP-AcmeReports"] }),
    user({ username: "priya.nair", displayName: "Priya Nair", title: "Staff Accountant", department: "Finance", office: "Denver HQ - 4th floor", manager: "tom.alvarez", employeeId: "10987", phone: "555-0163", passwordLastSet: daysAgo(3), passwordExpires: daysAhead(87), groups: ["SG-AllStaff"], mfa: [{ id: "m1", type: "Authenticator app (push)", device: "Pixel 8", added: daysAgo(3) }], mailbox: { usedGB: 0.1, quotaGB: 50, forwarding: null, rules: [] } }),
    user({ username: "emily.tran", displayName: "Emily Tran", title: "Financial Analyst", department: "Finance", office: "Denver HQ - 4th floor", manager: "tom.alvarez", employeeId: "10512", phone: "555-0112", groups: ["SG-AllStaff", "SG-Finance-RW", "APP-AcmeReports"] }),
    user({ username: "linda.okafor", displayName: "Linda Okafor", title: "Payroll Specialist", department: "Finance", office: "Denver HQ - 4th floor", manager: "tom.alvarez", employeeId: "10377", phone: "555-0177", groups: ["SG-AllStaff", "SG-Finance-RO", "SG-Payroll-RW"] }),
    user({ username: "angela.price", displayName: "Angela Price", title: "HR Director", department: "Human Resources", office: "Denver HQ - 4th floor", manager: "james.harlow", employeeId: "10040", phone: "555-0140", groups: ["SG-AllStaff", "SG-HR-RW"] }),
    user({ username: "denise.foster", displayName: "Denise Foster", title: "HR Generalist", department: "Human Resources", office: "Denver HQ - 4th floor", manager: "angela.price", employeeId: "10265", phone: "555-0165", groups: ["SG-AllStaff", "SG-HR-RW"], mailbox: { usedGB: 21.7, quotaGB: 50, forwarding: null, rules: [] } }),
    user({ username: "raj.patel", displayName: "Raj Patel", title: "Warehouse Supervisor", department: "Operations", office: "Aurora Warehouse", manager: "marcus.lee", employeeId: "10619", phone: "555-0119", groups: ["SG-AllStaff", "SG-Dispatch-RW"] }),
    user({ username: "grace.kim", displayName: "Grace Kim", title: "Office Coordinator", department: "Facilities", office: "Denver HQ - 3rd floor", manager: "kevin.osei", employeeId: "10703", phone: "555-0103", groups: ["SG-AllStaff"] }),
    user({ username: "omar.haddad", displayName: "Omar Haddad", title: "Logistics Coordinator", department: "Operations", office: "Denver HQ - 2nd floor", manager: "marcus.lee", employeeId: "10588", phone: "555-0188", groups: ["SG-AllStaff", "SG-Dispatch-RW"] }),
    user({ username: "marcus.lee", displayName: "Marcus Lee", title: "Dispatch Operations Manager", department: "Operations", office: "Denver HQ - 2nd floor", manager: "james.harlow", employeeId: "10071", phone: "555-0171", groups: ["SG-AllStaff", "SG-Dispatch-RW", "SG-VPN-Users"] }),
    user({ username: "jenna.morales", displayName: "Jenna Morales", title: "Customer Service Representative", department: "Customer Service", office: "Denver HQ - 1st floor", manager: "laura.bennett", employeeId: "10834", phone: "555-0134", groups: ["SG-AllStaff"] }),
    user({ username: "jennifer.morales", displayName: "Jennifer Morales", title: "Customs Compliance Analyst", department: "Operations", office: "Denver HQ - 2nd floor", manager: "marcus.lee", employeeId: "10455", phone: "555-0155", groups: ["SG-AllStaff", "SG-Dispatch-RW"] }),
    user({ username: "carlos.rivera", displayName: "Carlos Rivera", title: "Field Sales Representative", department: "Sales", office: "Remote - Phoenix", manager: "laura.bennett", employeeId: "10726", phone: "555-0126", groups: ["SG-AllStaff", "SG-Sales-RW", "SG-VPN-Users"], mfa: [{ id: "m1", type: "Authenticator app (push)", device: "Samsung Galaxy S22", added: daysAgo(620) }] }),
    user({ username: "frank.delgado", displayName: "Frank Delgado", title: "Fleet Manager", department: "Operations", office: "Aurora Warehouse", manager: "marcus.lee", employeeId: "10293", phone: "555-0193", groups: ["SG-AllStaff", "SG-Dispatch-RW", "SG-VPN-Users"] }),
    user({ username: "david.brooks", displayName: "David Brooks", title: "Regional Sales Manager", department: "Sales", office: "Remote - Kansas City", manager: "laura.bennett", employeeId: "10318", phone: "555-0148", groups: ["SG-AllStaff", "SG-Sales-RW", "SG-VPN-Users"] }),
    user({ username: "natalie.hughes", displayName: "Natalie Hughes", title: "Marketing Coordinator", department: "Marketing", office: "Denver HQ - 3rd floor", manager: "laura.bennett", employeeId: "10901", phone: "555-0109", groups: ["SG-AllStaff", "SG-Marketing-RW"] }),
  ];

  const devices = [
    dev("BL-LT-0442", "michael.chen", "Laptop", "Dell Latitude 7450", "10.20.3.42"),
    dev("BL-LT-0871", "michael.chen2", "Laptop", "Lenovo ThinkPad T14", "10.20.2.71"),
    dev("BL-LT-0101", "james.harlow", "Laptop", "Microsoft Surface Laptop 7", "10.20.5.11"),
    dev("BL-LT-0199", "diane.whitaker", "Laptop", "Microsoft Surface Laptop 7", "10.20.5.19"),
    dev("BL-LT-0144", "rebecca.stone", "Laptop", "Dell Latitude 7350", "10.20.5.44"),
    dev("BL-DT-0987", "priya.nair", "Desktop", "Dell OptiPlex 7020", "10.20.4.87"),
    dev("BL-LT-0512", "emily.tran", "Laptop", "Dell Latitude 7450", "10.20.4.12"),
    dev("BL-DT-0377", "linda.okafor", "Desktop", "Dell OptiPlex 7010", "10.20.4.77", { diskTotalGB: 256 }),
    dev("BL-LT-0265", "denise.foster", "Laptop", "HP EliteBook 840 G10", "10.20.4.65"),
    dev("BL-LT-0619", "raj.patel", "Laptop", "Dell Latitude 5440 Rugged", "10.40.1.19"),
    dev("BL-DT-0703", "grace.kim", "Desktop", "Dell OptiPlex 7020", "10.20.3.03"),
    dev("BL-DT-0588", "omar.haddad", "Desktop", "HP Elite Mini 800 G9", "10.20.2.88"),
    dev("BL-DT-0834", "jenna.morales", "Desktop", "Dell OptiPlex 7020", "10.20.1.34"),
    dev("BL-LT-0726", "carlos.rivera", "Laptop", "Dell Latitude 7450", "192.168.1.23"),
    dev("BL-LT-0293", "frank.delgado", "Laptop", "Lenovo ThinkPad T14", "10.40.1.93"),
    dev("BL-LT-0318", "david.brooks", "Laptop", "Dell Latitude 7450", "192.168.0.118"),
    dev("BL-LT-0901", "natalie.hughes", "Laptop", "Apple MacBook Air M3", "10.20.3.91"),
    dev("BL-LT-0171", "marcus.lee", "Laptop", "Lenovo ThinkPad X1 Carbon", "10.20.2.17"),
  ];

  const requests = [
    { id: "REQ0004397", requestedFor: "emily.tran", item: "APP-AcmeReports", type: "Application access", requestedBy: "emily.tran", approver: "tom.alvarez", status: "Fulfilled", date: daysAgo(60), justification: "Monthly close reporting" },
  ];

  return { users, devices, requests, groups: GROUPS.map((g) => ({ ...g })), callbacks: {}, consoleNotes: [] };
}

let keySeed = 1;
function dev(hostname, assignedTo, type, model, ip, extra = {}) {
  const keyId = hexId(hostname);
  return {
    hostname,
    assignedTo,
    type,
    model,
    os: "Windows 11 Enterprise 24H2",
    ip,
    lastSeen: minutesAgo(30),
    diskTotalGB: 512,
    diskFreeGB: 214,
    bitlocker: [{ keyId, recoveryKey: recoveryKey(keySeed++), created: daysAgo(300) }],
    ...extra,
  };
}

// Deterministic fake BitLocker data so the same device always has the same key.
function hexId(seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const part = (n) => ((h * n) >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
  return `${part(7)}-${part(13).slice(0, 4)}-${part(17).slice(0, 4)}-${part(19).slice(0, 4)}-${part(23)}${part(29).slice(0, 4)}`;
}
function recoveryKey(seed) {
  const groups = [];
  let x = seed * 7919;
  for (let i = 0; i < 8; i++) {
    x = (x * 48271) % 2147483647;
    groups.push(String((x % 900000) + 100000));
  }
  return groups.join("-");
}

export function findUser(env, username) {
  return env.users.find((u) => u.username === username);
}
export function findDevice(env, hostname) {
  return env.devices.find((d) => d.hostname === hostname);
}
