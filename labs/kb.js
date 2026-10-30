// Brightline IT knowledge base. Students can search this during labs, the
// same way a real help desk tech checks the KB. It explains procedures and
// policy, not the answer to any specific ticket.
// Light markdown: "## heading", "- bullet", "1. step", **bold**, `code`.

export default [
  {
    id: "KB-001",
    title: "Identity Verification Policy",
    tags: ["policy", "security", "password", "unlock", "verification"],
    body: `Verify the caller's identity **before** any account change: unlock, password reset, group change, MFA change, or disclosing a recovery key.

## Standard verification (pick TWO)
- Employee ID (on their badge)
- Manager's full name
- Callback to the phone number **on file** in the Admin Center (not a number the caller gives you)

## Stronger verification required
- **MFA resets** and **BitLocker keys**: see KB-012 and KB-008.
- **VIP / executive accounts** (flagged in the Admin Center): a callback to the number on file is mandatory.

## Never
- Ask for the user's current password. IT will never need it.
- Read out account details (phone on file, email aliases, lock status, security questions) to an unverified caller.
- Skip verification because the caller is senior, angry, or in a hurry. Pressure is a classic social-engineering tactic.

If the caller can't be verified, offer the legitimate path (callback to the number on file), make no changes, and report anything suspicious to Security Operations (KB-004).`,
  },
  {
    id: "KB-002",
    title: "Password & Lockout Policy",
    tags: ["password", "lockout", "policy"],
    body: `## Rules
- Minimum 14 characters. Passwords expire every **90 days**. Users get daily reminders 14 days before expiry.
- **Lockout:** 5 bad attempts locks the account for 30 minutes. After verification (KB-001), a tech may unlock early.

## Unlock vs. reset
- If the user knows their password, **unlock**. Don't reset by default.
- After unlocking, find the **cause** or it will lock again: Caps Lock or Num Lock, a new keyboard or keyboard layout, an old password saved on a phone or mapped drive, etc. Check the sign-in log for where the failures came from.

## Resetting
- Admin Center → Users → select user → **Reset password**. A temporary password is generated.
- "User must change password at next logon" is checked by default. See KB-007 for remote users.
- Give the temporary password to the verified user only, by voice. Never email it.`,
  },
  {
    id: "KB-003",
    title: "Access Requests & Least Privilege",
    tags: ["access", "groups", "permissions", "share", "policy"],
    body: `Access to shared folders and applications is controlled by **security groups** (SG-*).

## Policy
- Help desk may only grant access that has an **approved request** (Admin Center → Requests) from the data owner or manager listed as approver.
- **Rejected** or **pending** requests are not approved. Don't grant them, even if the user or their manager says it's fine verbally. Direct them to submit or appeal through the request process.
- Grant exactly what was approved (e.g., RW vs RO). Nothing extra.

## After adding a user to a group
Windows reads group memberships when the user **signs in**. The user must **sign out and back in** (or restart) before new access works. Until then they'll still see "access denied".

## Fulfilling a request
Add the group, have the user sign out/in, confirm access, and note the REQ number in your ticket.`,
  },
  {
    id: "KB-004",
    title: "Suspected Phishing / Compromised Account",
    tags: ["security", "phishing", "incident", "compromise", "inbox rule", "forwarding", "soc"],
    body: `Treat a suspected compromised account as a **security incident**. Act fast, contain, then hand off to Security Operations (SOC).

## Signs of compromise
- User entered credentials on a link, or approved an MFA prompt they didn't start
- Sign-ins from unfamiliar locations, IPs, or hosting providers
- New MFA methods the user didn't add
- Inbox rules that hide, move, or delete mail (often oddly named, like "." or "..")
- Forwarding to external addresses
- Contacts receiving emails the user didn't send

## Containment checklist (after quick verification, KB-001)
1. **Reset the password.**
2. **Revoke all sessions.** A new password does NOT sign out an attacker who already has a session token.
3. **Remove MFA methods the user doesn't recognize** (or reset MFA and re-register with the user).
4. **Disable** malicious inbox rules. Don't delete them; SOC needs them as evidence. Leave the user's legitimate rules alone.
5. **Remove external forwarding.**
6. Ask the user to report the phishing email with the **Report** button and **not delete it**.

## Escalate to Security Operations (SOC)
Include: user, time of the phish, what the user entered/approved, suspicious IPs, rules and forwarding found, MFA methods removed, and who received fraudulent emails. SOC handles message traces, notifying recipients, and fraud follow-up.

## Talking to the user
No blame. Thank them for reporting quickly. Users who feel blamed stop reporting.`,
  },
  {
    id: "KB-005",
    title: "Escalation Matrix & Writing Good Escalations",
    tags: ["escalation", "teams", "tier 2", "network", "soc"],
    body: `## Who handles what
- **Tier 2 Desktop Support**: complex OS issues, reimaging, software packaging
- **Network Operations**: switch ports, wall jacks / patching, Wi-Fi infrastructure, outages, VPN concentrators
- **Security Operations (SOC)**: phishing, compromised accounts, social engineering attempts, malware
- **Field Services**: hands-on hardware swaps, desk-side and AV/boardroom visits
- **Applications Team**: line-of-business apps and add-ins (e.g., AcmeReports), application rollouts
- **Identity & Access Management (IAM)**: bulk access changes, role design, privileged accounts

## Before you escalate
Do the Tier 1 troubleshooting first. Escalate when the fix needs access or skills you don't have, or policy requires it (security incidents always go to SOC).

## A good escalation lets the next team act without calling the user again
- Symptoms and exact error messages
- Scope (one user, a floor, everyone?)
- What you tested and the result of each test
- Relevant identifiers: hostnames, jack/port numbers, IPs, versions, related ticket numbers
- Workaround given to the user and business impact or deadline`,
  },
  {
    id: "KB-006",
    title: "Network Troubleshooting Basics (Windows)",
    tags: ["network", "wifi", "dns", "ipconfig", "ping", "nslookup", "ethernet"],
    body: `Work from the bottom up: **physical → IP address → name resolution → application**.

## Quick checks
- Scope: just this device, or others nearby too?
- Network icon in the taskbar: Wi-Fi bars, globe with a no-entry symbol (not connected), or an **airplane** (airplane mode)?
- Wired: are the port lights on? \`ipconfig\` showing **Media disconnected** = physical problem (cable, jack, port).

## Commands (Command Prompt)
- \`ipconfig\`: IP address, subnet mask, gateway
- \`ipconfig /all\`: adds DHCP status and **DNS Servers**
- \`ping 10.20.0.50\` vs \`ping track.brightline.local\`: if the IP works but the name fails, it's **DNS**
- \`nslookup <name>\`: which DNS server answered and what it returned
- \`ipconfig /flushdns\`: clears cached DNS answers

## Brightline values
- Office DNS servers come from DHCP: **10.20.0.10** and **10.20.0.11**. Public DNS (8.8.8.8, 1.1.1.1) can't resolve internal *.brightline.local names.
- A 169.254.x.x address means DHCP failed.

## Airplane mode
Some laptops toggle airplane mode with a function key. Turn it off from the network icon's quick settings panel or Settings > Network & internet.`,
  },
  {
    id: "KB-007",
    title: "SecureLink VPN & Remote Password Issues",
    tags: ["vpn", "remote", "password", "expired", "cached credentials"],
    body: `## Why remote password changes fail
Off the corporate network and off VPN, a laptop can't reach a domain controller. Windows signs the user in with **cached credentials** (their last known password). Ctrl+Alt+Del > Change a password fails with "cannot contact a domain controller".

## Expired password for a remote user
1. Verify identity (KB-001).
2. Reset the password and **UNCHECK "User must change password at next logon."** If it's checked, SecureLink VPN rejects the temporary password ("must change password before logging on") and the user can't change it remotely, so they're stuck.
3. User connects SecureLink VPN with the temporary password.
4. **While still on VPN**: lock the PC (Win+L) and unlock with the temporary password. This updates the cached credentials. Do **not** sign out or restart (that drops the VPN, and the login screen will only accept the old cached password).
5. Still on VPN: Ctrl+Alt+Del > **Change a password** to a password only the user knows.
6. Update the password in Outlook/Teams if prompted.

Self-service password reset is not yet available at Brightline.`,
  },
  {
    id: "KB-008",
    title: "BitLocker Recovery Keys",
    tags: ["bitlocker", "recovery", "encryption", "security"],
    body: `BitLocker may ask for a recovery key after firmware/BIOS updates, hardware changes, or repeated failed PINs.

## Before you disclose a key
A recovery key unlocks all data on the device. **Verify identity first** (KB-001: two factors, or a callback to the number on file). Callers on shared or unknown phones should get a callback on their own number on file.

## Finding the right key
1. Ask the user to read the **Recovery key ID** shown on their screen (the first 8 characters are enough).
2. Admin Center → Devices → find the device → match the Key ID. Devices can have **more than one** key (e.g., from before a re-image). Use only the one that matches.
3. Reveal it. **Every reveal is audited.** Don't reveal keys for devices that aren't part of the ticket.

## Reading it out
48 digits in 8 groups of 6. Read one group at a time and have the user confirm each group. On the recovery screen, the function keys F1-F10 can be used as numbers (F10 = 0).

Note the cause and Key ID in the ticket.`,
  },
  {
    id: "KB-009",
    title: "Printing & Default Printers (Windows 11)",
    tags: ["printer", "print", "default printer", "queue"],
    body: `## Common causes of "nothing prints"
- Wrong **default printer** (e.g., an old printer that was removed)
- Jobs stuck in a queue for an **offline** printer
- Printer out of paper/toner or showing an error

## Change the default printer
1. Settings > Bluetooth & devices > **Printers & scanners**
2. Turn **off** "Let Windows manage my default printer". While it's on, the "Set as default" button is hidden.
3. Click the correct printer → **Set as default**

## Clear a stuck queue
Click the printer → **Open print queue** → cancel the stuck documents. If the printer no longer exists, **Remove** it.

## Brightline printers
3rd floor: **BL-MFP-3F-Canon** (installed last week; replaced BL-PRN-3F-HP, which was removed).`,
  },
  {
    id: "KB-010",
    title: "Customer Service Standards",
    tags: ["customer service", "soft skills", "communication", "vip"],
    body: `## Every call
- **Greet:** your name, help desk, and offer to help. Use the caller's name.
- **Listen and acknowledge:** restate the problem; show empathy, especially when there's a deadline.
- **Set expectations:** tell them what you're going to do and roughly how long it takes.
- **Plain language:** no unexplained jargon. Give one instruction at a time and wait for the result.
- **Never blame the user.** Explain what happened and how to avoid it next time.
- **Confirm the fix** with the user before closing. Ask if there's anything else.

## VIPs and urgent situations
Be calm, confident, and concise. Don't ask questions you don't need. Consider sending a desk-side tech (Field Services) in parallel. Security policy still applies to account changes, VIP or not.

## Saying no
Be polite and firm, explain the reason briefly, and offer the legitimate path ("I can't do X, but here's how we can get it done").`,
  },
  {
    id: "KB-011",
    title: "Outlook Troubleshooting",
    tags: ["outlook", "email", "offline", "outbox", "mailbox"],
    body: `## Not receiving or sending mail
1. Scope: only Outlook? Webmail (outlook.office.com) working? Others affected?
2. Look at the **status bar** at the bottom of Outlook: "Connected to: Microsoft Exchange", "Disconnected", or "**Working Offline**".
3. **Send / Receive** tab → the **Work Offline** button toggles offline mode. If it's highlighted, Outlook isn't talking to the server. Click it to go back online.
4. Check the **Outbox** for stuck messages.
5. Mailbox quota: Admin Center → Users → Mailbox. Mail stops at 100% of quota.

Only consider profile rebuilds or repairs after these checks.`,
  },
  {
    id: "KB-012",
    title: "MFA (Multi-Factor Authentication) Support",
    tags: ["mfa", "authenticator", "phone", "security"],
    body: `## Policy
- MFA is **mandatory** for all users. Help desk cannot disable MFA "temporarily" for anyone.
- **MFA reset requires stronger verification**: a callback to the phone number **on file**, OR confirmation from the user's manager by callback, in addition to standard verification.
- Never register a phone number or device that the caller gives you over the phone.

## New phone / lost phone
1. Verify (above).
2. Admin Center → Users → MFA → remove the old method (or **Reset MFA**, which requires re-registration).
3. User signs in → "**More information required**" → installs Microsoft Authenticator → *Add account > Work or school account > Scan QR code* → approves the test notification.
4. Confirm sign-in works on their apps.

## Users should
Move MFA to the new phone **before** trading in the old one.`,
  },
  {
    id: "KB-013",
    title: "Monitors, Docks & Projection",
    tags: ["monitor", "display", "projector", "hdmi", "boardroom", "win+p"],
    body: `## Monitor shows "No signal"
1. Is the monitor on, and on the right **input/source**?
2. Cables seated at both ends?
3. **Windows+P** opens the projection menu: *PC screen only*, *Duplicate*, *Extend*, *Second screen only*. If "PC screen only" is selected, other displays get no signal.
4. Settings > System > Display > Multiple displays → **Extend these displays** / **Detect**.

## Presenting (boardroom)
- TV/projector must be on the input the table cable connects to (check labels; use the remote's **Source/Input** button).
- **Extend** + PowerPoint Slide Show = slides on the TV, Presenter View on the laptop (Slide Show tab → Monitor). **Duplicate** mirrors the same image on both.
- **Audio** over HDMI: taskbar speaker icon → choose the TV/display audio device as output.

For boardroom emergencies, send Field Services in parallel.`,
  },
  {
    id: "KB-014",
    title: "Office Apps Crashing: Safe Mode & Add-ins",
    tags: ["excel", "word", "office", "crash", "add-in", "safe mode"],
    body: `## Isolate add-ins first
1. Start the app in **Safe Mode**: Win+R → \`excel /safe\` (or \`winword /safe\`), or hold **Ctrl** while launching. Safe Mode loads no add-ins.
2. If Safe Mode works, an add-in is the likely cause.
3. File > Options > Add-ins > Manage: **COM Add-ins** > Go. Uncheck add-ins one at a time and restart the app normally.
4. Event Viewer > Windows Logs > Application shows the **faulting module** for crashes.

## Then
- If a company-deployed add-in breaks after an update, **others are probably affected**. Notify the **Applications Team** with the add-in name, version, faulting module, and workaround.
- Office Quick/Online Repair and reinstalling won't fix a bad add-in. Try them only after ruling add-ins out.`,
  },
  {
    id: "KB-015",
    title: "Slow PC & Low Disk Space",
    tags: ["slow", "performance", "disk", "storage", "task manager"],
    body: `## Diagnose
- Task Manager (Ctrl+Shift+Esc) > **Performance**: which resource is maxed (CPU, Memory, Disk)?
- File Explorer > This PC: free space on C:. Below ~10% free, Windows slows down badly.
- Admin Center → Devices shows disk free space and health alerts.

## Free up space (with the user's consent)
- Settings > System > **Storage** shows what is using space.
- Empty the **Recycle Bin**, clear **Temporary files**.
- **Downloads** often holds duplicates and large videos. Sort by size and ask before deleting.
- Turn on **Storage Sense** to clean temporary files automatically.

## Data handling
Never delete user files without asking. Files with sensitive data (payroll, HR, customer data) belong on the proper secured share, not in Downloads.`,
  },
];
