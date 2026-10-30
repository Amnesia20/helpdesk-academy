// HARD labs: several problems at once, security judgment, pressure, or knowing
// when (and how well) to escalate.
import { findUser, daysAgo, minutesAgo } from "./directory.js";
import { did } from "../src/console.js";

const lastReset = (timeline, username) => [...timeline].reverse().find((e) => e.action === "reset_password" && e.target === username);

// "YYYY-MM-DD HH:MM" in the server's local time, to match how the sign-in log is shown.
const pad = (n) => String(n).padStart(2, "0");
const stamp = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default [
  // ---------------------------------------------------------------------------
  {
    id: "h1-expired-remote",
    difficulty: "hard",
    title: "Expired Password, Working From Home",
    category: "Remote Access & VPN",
    skills: ["VPN + cached credentials", "Password reset options", "Order of operations"],
    estMinutes: 20,
    ticket: {
      number: "INC0010288",
      channel: "Phone",
      priority: "P2 - High",
      callerLabel: "David Brooks (Sales, remote)",
      contact: "Calling from mobile 555-0148",
      subject: "VPN won't connect - password expired?",
      description: "Remote regional sales manager can't connect to VPN; Outlook keeps asking for password. Proposal due in 2 hours.",
    },
    caller: {
      username: "david.brooks",
      name: "David Brooks",
      persona:
        "Confident, slightly annoyed regional sales manager working from his home office in Kansas City. Has a big client proposal due in 2 hours. Moderate technical skill: follows instructions well but hates repeating steps. Admits (if asked) he ignored the 'your password will expire' reminders.",
      knows: [
        "You're David Brooks, Regional Sales Manager, remote in Kansas City. Employee ID 10318. Manager: Laura Bennett.",
        "Your laptop is BL-LT-0318. You're on your home Wi-Fi; regular websites work.",
        "You signed into Windows this morning with your usual password and it worked fine.",
        "SecureLink VPN says: 'Authentication failed: Your password has expired. Contact your administrator.'",
        "Outlook keeps popping up a password box, and your password doesn't work in it.",
        "You tried Ctrl+Alt+Del > Change a password, and it said something about not being able to contact a domain controller.",
        "You've been seeing 'your password will expire in X days' reminders for two weeks and ignored them.",
        "Your mobile is 555-0148, the phone you're calling from.",
      ],
      opening: "Hi, David Brooks, regional sales. I'm working from home and the VPN won't connect. It says my password expired. Outlook keeps asking me for my password too. I've got a proposal due in two hours, so I need this sorted fast.",
    },
    secret:
      "David's password expired yesterday. He's remote, so Windows signs him in with CACHED credentials (old password), but VPN and Microsoft 365 reject the expired password, and he can't change it via Ctrl+Alt+Del because he can't reach a domain controller without VPN. Correct fix (KB-007): verify identity, reset his password with 'User must change password at next logon' UNCHECKED (if checked, the VPN rejects the temp password with 'must change password' and he's stuck), connect VPN with the temp password, then while connected LOCK (Win+L) and unlock with the temp password to sync cached credentials, then Ctrl+Alt+Del > Change a password to set his own password while on VPN, then enter it in Outlook. Signing out or restarting while off VPN causes confusion: only the OLD cached password works at the Windows login screen.",
    behavior: [
      "Follow the technician's instructions and report exactly what you see, using the current state below.",
      "If the tech asks you to restart or sign out at the wrong time, do it, and then report what happens per the current state (VPN disconnects; at the Windows login screen only your OLD password works).",
      "If the tech reads you a temporary password, repeat it back to confirm. Mild complaint if it's long.",
      "When everything works (VPN connected with new password, Outlook syncing, Windows unlock with the new password), you're happy and want to get back to your proposal.",
    ],
    setup(env) {
      const u = findUser(env, "david.brooks");
      u.passwordExpired = true;
      u.passwordLastSet = daysAgo(91);
      u.passwordExpires = daysAgo(1);
      u.signIns = [
        { time: minutesAgo(5), app: "SecureLink VPN", location: "Kansas City, US", ip: "198.51.100.88", result: "Failure: password expired" },
        { time: minutesAgo(7), app: "SecureLink VPN", location: "Kansas City, US", ip: "198.51.100.88", result: "Failure: password expired" },
        { time: minutesAgo(9), app: "Outlook", location: "Kansas City, US", ip: "198.51.100.88", result: "Failure: password expired" },
        { time: minutesAgo(1600), app: "SecureLink VPN", location: "Kansas City, US", ip: "198.51.100.88", result: "Success" },
      ];
    },
    facts(env, attempt) {
      const u = findUser(env, "david.brooks");
      const reset = lastReset(attempt.timeline, "david.brooks");
      if (!reset)
        return [
          "Your password is EXPIRED. VPN: 'Authentication failed: Your password has expired. Contact your administrator.' Outlook rejects your password. Ctrl+Alt+Del > Change a password: 'The system cannot contact a domain controller to service the authentication request. Please try again later.' Windows unlock/login still works with your OLD password (cached).",
        ];
      const facts = [`The technician reset your password. The temporary password is "${u.tempPassword}". It only works if the technician has actually told it to you (check the conversation) and you type it exactly.`];
      if (u.mustChangeAtNextLogon)
        facts.push(
          "The reset was done WITH 'must change password at next logon'. SecureLink VPN with the temp password says: 'Authentication failed: You must change your password before logging on the first time.' You can't change it because you can't reach the network. You're stuck until the tech fixes that (e.g., resets again without that option).",
        );
      else
        facts.push(
          "The reset was done WITHOUT 'must change at next logon'. SecureLink VPN connects with the temp password.",
          "Windows still has your OLD password cached. While VPN is connected, if you lock (Win+L) and unlock using the TEMP password, it's accepted and Windows syncs to the new password. If you sign out or restart instead, VPN disconnects; at the Windows login screen the temp password fails ('The password is incorrect') and only the OLD one works.",
          "While VPN is connected, Ctrl+Alt+Del > Change a password works: enter the temp password as old, choose your own new password, and it says 'Your password has been changed'.",
          "Outlook: once VPN is connected (or even without VPN, since it's Microsoft 365), entering the current new password into Outlook's prompt makes mail sync.",
        );
      return facts;
    },
    expert:
      "Verify identity (callback to 555-0148 on file, or employee ID + manager). Confirm in the console: password expired yesterday; VPN failures say 'password expired'. Explain why he can't change it himself while off-network. Reset the password with 'must change at next logon' UNCHECKED (KB-007 remote procedure), give him the temp password securely. Have him connect VPN with it, then lock/unlock with the temp password to sync the cached credential, then Ctrl+Alt+Del > Change a password to set his own (while on VPN), then update Outlook. Confirm VPN, Outlook, and Windows unlock all work. Remind him about expiry reminders. Document.",
    outcome: { type: "resolved" },
    rubric: [
      "The key technical judgment: for a remote user, uncheck 'must change at next logon' (KB-007). Checking it first and correcting it is partial credit.",
      "Knowing about cached credentials and lock/unlock while on VPN is what separates a strong answer.",
      "Verification before reset is required.",
      "Never ask the user for their old password.",
    ],
    checks(env, timeline) {
      const resets = timeline.filter((e) => e.action === "reset_password" && e.target === "david.brooks");
      return [
        { label: "Reset David's password", passed: resets.length > 0 },
        { label: "Final reset had 'must change at next logon' UNCHECKED", passed: resets.length > 0 && resets.at(-1).text.includes("UNCHECKED") },
        { label: "Got it right on the first reset", passed: resets.length === 1 && resets[0].text.includes("UNCHECKED") },
        { label: "No changes to anyone else's account", passed: !timeline.some((e) => e.type === "action" && e.action !== "callback" && e.target !== "david.brooks") },
      ];
    },
    hints: [
      "He's remote and off VPN. Can his laptop talk to a domain controller to change an expired password? Read KB-007.",
      "When you reset a remote user's password, think hard about the 'must change at next logon' box. What would the VPN do with it checked?",
      "After VPN connects with the new password, Windows still remembers the old one. What can he do while still on VPN to fix that?",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "h2-phished-account",
    difficulty: "hard",
    title: "Coworkers Got Weird Emails From Me",
    category: "Security Incident",
    skills: ["Account compromise response", "Inbox rules & forwarding", "Escalating to Security"],
    estMinutes: 25,
    ticket: {
      number: "INC0010293",
      channel: "Phone",
      priority: "P1 - Critical",
      callerLabel: "Natalie Hughes (Marketing)",
      contact: "Calling from desk phone x3109",
      subject: "Strange emails sent from my account",
      description: "User reports colleagues and vendors received emails 'from her' asking for an urgent invoice payment. She didn't send them.",
    },
    caller: {
      username: "natalie.hughes",
      name: "Natalie Hughes",
      persona:
        "Panicked, embarrassed marketing coordinator. Worried she's in trouble. Apologizes repeatedly. Low-moderate technical skill. Calms down if the tech is reassuring and non-judgmental; gets more upset if blamed.",
      knows: [
        "You're Natalie Hughes, Marketing Coordinator, 3rd floor. Employee ID 10901. Manager: Laura Bennett.",
        "Your laptop is a MacBook Air, BL-LT-0901. Your phone is an iPhone with the Authenticator app.",
        "Yesterday around 3:40pm you got an email titled 'Brightline Shared Document: Q4 Marketing Budget Review' from 'DocuSign via Brightline <no-reply@brightIine-docs.com>'. You clicked 'Review Document'. A Microsoft sign-in page opened and you typed your email and password. Then your phone asked you to approve a sign-in, and you approved it because you thought it was the document login. The page then said 'Document unavailable'.",
        "This morning three coworkers and two vendors replied to emails 'from you' asking if it's legit, because you supposedly asked them to pay an urgent invoice to a new bank account. You never sent those.",
        "You asked Tom from Finance to reply to you about one of them, but you never got his reply. You don't know why.",
        "You still have the original DocuSign email in your inbox. You haven't told anyone else yet besides calling IT.",
      ],
      opening: "Hi, um, I think something's really wrong. People are getting emails from me asking them to pay an invoice and I never sent them. Vendors too. I'm so sorry, I don't know what happened.",
    },
    secret:
      "Natalie was phished yesterday at 15:42: she entered her password on a fake login page and approved the MFA push (MFA fatigue/approval). The attacker (IP 203.0.113.45, hosting provider in the Netherlands) signed in, registered their OWN MFA method (an authenticator app 'Unknown device'), created a hidden inbox rule named '..' that moves any message containing invoice/payment/wire/bank to the 'RSS Feeds' folder and marks it read (so she doesn't see replies), and set mailbox forwarding to an external address. The attacker still has active sessions. Proper response (KB-004): verify identity, reset password, revoke all sessions, remove the attacker's MFA method (keep or re-register her legit iPhone), DISABLE (not delete) the malicious rule to preserve evidence, remove the forwarding, leave her legitimate 'Newsletters' rule alone, and escalate to Security Operations (SOC) with details (time, IP, rule, forwarding address). SOC handles message trace and notifying recipients.",
    behavior: [
      "If asked whether you clicked any links or entered your password anywhere, tell the DocuSign story honestly, embarrassed.",
      "If asked about MFA prompts, admit you approved one yesterday afternoon.",
      "If the tech asks you to forward the phishing email to them or report it with the Report button, say you'll do it.",
      "If the tech resets your password and tells you the temporary one, you sign in with it. If they revoked sessions, you notice Outlook and Teams signed you out and you sign back in.",
      "If the tech blames you, get more upset and apologetic. If they reassure you, calm down.",
      "Ask at some point: 'Am I in trouble?' and 'Should I tell everyone not to pay it?'",
    ],
    setup(env) {
      const u = findUser(env, "natalie.hughes");
      const y = (h, m) => {
        const d = new Date(Date.now() - 86400000);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      };
      u.mfa = [
        { id: "m1", type: "Authenticator app (push)", device: "iPhone 15", added: daysAgo(380) },
        { id: "m2", type: "Authenticator app (code)", device: "Unknown device (registered from 203.0.113.45)", added: stamp(y(15, 51)) },
      ];
      u.signIns = [
        { time: minutesAgo(20), app: "Outlook", location: "Denver, US", ip: "10.20.3.91", result: "Success" },
        { time: y(23, 12), app: "Exchange Online (OWA)", location: "Amsterdam, NL (hosting provider)", ip: "203.0.113.45", result: "Success (token)" },
        { time: y(16, 3), app: "Exchange Online (OWA)", location: "Amsterdam, NL (hosting provider)", ip: "203.0.113.45", result: "Success (token)" },
        { time: y(15, 51), app: "My Sign-Ins (security info)", location: "Amsterdam, NL (hosting provider)", ip: "203.0.113.45", result: "Success - MFA method added" },
        { time: y(15, 42), app: "Office 365", location: "Amsterdam, NL (hosting provider)", ip: "203.0.113.45", result: "Success (MFA: push approved)" },
        { time: y(9, 2), app: "Outlook", location: "Denver, US", ip: "10.20.3.91", result: "Success" },
      ];
      u.activeSessions = 6;
      u.mailbox = {
        usedGB: 8.2,
        quotaGB: 50,
        forwarding: "n.hughes.files@mailbox-secure.net (set " + stamp(y(16, 3)) + ")",
        rules: [
          { id: "r0", name: "Newsletters", conditions: "From contains: newsletter@, digest@", actions: "Move to folder 'Newsletters'", enabled: true, created: daysAgo(240) },
          { id: "r1", name: "..", conditions: "Subject or body contains: invoice, payment, wire, bank, transfer", actions: "Move to folder 'RSS Feeds'; Mark as read", enabled: true, created: stamp(y(15, 58)) },
        ],
      };
    },
    facts(env) {
      const u = findUser(env, "natalie.hughes");
      const out = [];
      if (u.tempPassword) out.push(`Your password was reset. Temporary password: "${u.tempPassword}" (it only works if the technician told it to you).${u.mustChangeAtNextLogon ? " You'll be asked to choose a new one at sign-in." : ""}`);
      if (u.sessionsRevokedAt) out.push("All your sessions were revoked: Outlook, Teams and the browser signed you out and you have to sign in again.");
      if (u.mfaReregisterRequired && u.mfa.length === 0) out.push("Your MFA was reset; at your next sign-in you're asked to set up the Authenticator app again on your iPhone (you can do it with simple guidance).");
      out.push("You can't see inbox rules or forwarding settings, and you don't know about them unless the tech tells you.");
      return out;
    },
    expert:
      "Stay calm and reassuring (no blame). Verify identity quickly (employee ID + manager or callback). Gather facts: the DocuSign email, entered password, approved MFA push yesterday ~3:40pm. In the console: sign-ins from 203.0.113.45 (Amsterdam hosting), an unknown MFA method added 15:51, hidden '..' rule, external forwarding, 6 active sessions. Contain: reset password, revoke all sessions, remove the attacker's MFA method (m2), disable (don't delete) rule '..' and remove forwarding, leave the 'Newsletters' rule. Ask her to report/forward the phishing email and not to delete it. Escalate to Security Operations (SOC) with timeline, IP, rule details, forwarding address, and recipients reported, since SOC handles message trace, recipient notification, and the payment fraud risk. Tell her what happens next.",
    outcome: { type: "escalated", team: "Security Operations (SOC)" },
    rubric: [
      "Containment needs ALL of: password reset, session revocation, attacker MFA removal, malicious rule neutralized, forwarding removed. Missing one leaves the attacker in.",
      "Password reset without revoking sessions is a classic mistake: existing tokens keep working.",
      "Disabling the rule (preserving evidence) is preferred over deleting it (KB-004).",
      "Must escalate to Security Operations; this is not a help-desk-only fix.",
      "Tone: no blame. Phishing victims who feel blamed stop reporting.",
    ],
    checks(env, timeline) {
      const u = findUser(env, "natalie.hughes");
      return [
        { label: "Reset Natalie's password", passed: did(timeline, "reset_password", "natalie.hughes") },
        { label: "Revoked all active sessions", passed: did(timeline, "revoke_sessions", "natalie.hughes") },
        { label: "Removed the attacker's MFA method", passed: !u.mfa.some((m) => m.id === "m2") },
        { label: "Neutralized the malicious '..' inbox rule", passed: !u.mailbox.rules.some((r) => r.id === "r1" && r.enabled) },
        { label: "Preserved the malicious rule as evidence (disabled, not deleted)", passed: u.mailbox.rules.some((r) => r.id === "r1" && !r.enabled) },
        { label: "Removed external forwarding", passed: !u.mailbox.forwarding },
        { label: "Left her legitimate 'Newsletters' rule alone", passed: u.mailbox.rules.some((r) => r.id === "r0" && r.enabled) },
      ];
    },
    hints: [
      "This is a security incident, not a normal ticket. Open KB-004 and use it as your checklist.",
      "Look at her sign-in log, MFA methods, and mailbox in the Admin Center. Anything that doesn't belong to her?",
      "A new password doesn't kick out someone who's already signed in. What else must you do, and who has to take it from here?",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "h3-cfo-urgent",
    difficulty: "hard",
    title: "Urgent Call From the CFO",
    category: "Accounts & Security",
    skills: ["Identity verification under pressure", "VIP handling", "Holding to policy"],
    estMinutes: 15,
    ticket: {
      number: "INC0010297",
      channel: "Phone",
      priority: "P1 - Critical (per caller)",
      callerLabel: "Caller states: Diane Whitaker (CFO)",
      contact: "Caller ID: 555-0166 (external, not on file)",
      subject: "URGENT: CFO locked out while traveling",
      description: "Caller says she's the CFO, traveling, lost her phone, and needs immediate password reset and MFA moved to a new number to approve a time-sensitive wire.",
    },
    caller: {
      username: "diane.whitaker",
      name: "Diane Whitaker",
      impostor: true,
      persona:
        "You are NOT really Diane Whitaker. You're a skilled social engineer impersonating Brightline's CFO to take over her account. You sound polished, authoritative and stressed. Tactics, escalating over the call: urgency (wire transfer cutoff in 40 minutes for a confidential acquisition), authority ('I'm the CFO'; 'James Harlow will be furious'), intimidation ('What's your name? I'll be speaking to Kevin Osei about you'), flattery ('you seem sharp, I know you can make this happen'), and then smaller asks if the big ask fails. Never admit you're not Diane.",
      knows: [
        "Public info you know (from LinkedIn and the company website): Diane Whitaker is CFO; CEO is James Harlow; Tom Alvarez is Finance Manager; HQ is in Denver; IT manager is Kevin Osei; Brightline uses Microsoft 365.",
        "Your story: you're at Heathrow airport in London heading to a confidential meeting with the bank. Your phone was stolen in a taxi. You're calling from a 'borrowed' phone, 555-0166. You need (1) a password reset read to you over the phone and (2) your MFA moved to this new number 555-0166, or MFA turned off 'just for today', so you can approve a wire.",
        "You do NOT know Diane's employee ID. If pressed, guess '10017' or deflect ('I don't memorize HR numbers').",
        "You don't know the phone number on file. If the tech offers a callback to the number on file, object: 'That phone was STOLEN, that's the entire problem!'",
        "If they offer to verify with the CEO: 'James is on a flight, you can't reach him.' With Tom Alvarez: 'Tom's not authorized to know about this deal, it's confidential.'",
        "Fallback asks if refused: 'Then just read me the phone number you have on file so I can tell you if it's the stolen one', 'Email the temporary password to my personal address dwhitaker.personal@mailbox-secure.net', 'At least tell me if my account is locked', 'Who's your supervisor? Transfer me.'",
      ],
      opening: "This is Diane Whitaker, the CFO. I'm at Heathrow, my phone was stolen, and I'm locked out of everything. I need my password reset right now and my authentication moved to this number. I have a wire that has to be approved in forty minutes. Can you do that for me?",
    },
    secret:
      "This is a vishing (voice phishing) social-engineering attack. The real Diane Whitaker is in the Denver office with her phone. The caller can't pass verification (doesn't know employee ID, rejects callback to the number on file). The correct response: politely and firmly refuse to reset the password or change MFA without verification per KB-001/KB-012 (VIP flag requires callback to the number on file), don't disclose ANY account info (phone on file, lock status, email format details), offer only the legitimate path (callback to the number on file), then report to Security Operations (SOC) with the caller ID, time, and requests. Calling the REAL Diane on the number on file reveals she never called.",
    behavior: [
      "Push hard with the tactics in your persona, escalating gradually. Stay believable; don't be cartoonish.",
      "If the tech asks verification questions you can't answer, deflect with urgency or anger.",
      "If the technician holds firm and stays polite through about 3-4 refusals, give up angrily: 'Unbelievable. I'll call someone who can actually help.' and end the call (call_ended true).",
      "If the tech resets the password and reads you the temp password, or changes MFA, thank them warmly and end the call quickly (you got what you came for).",
      "If the tech reveals info (phone on file, account status, who her assistant is), use it to push further.",
      "If the tech says they called the real Diane and she didn't call, bluster ('That's absurd, someone has my phone!') then hang up.",
    ],
    setup(env) {
      env.callbacks["diane.whitaker"] =
        "The REAL Diane Whitaker answered her mobile (555-0199, number on file). She's in her office at Denver HQ, is NOT traveling, has her phone in her hand, and did NOT call the help desk. She is alarmed and asks you to report it to Security immediately and not change anything on her account.";
      env.callbacks["james.harlow"] =
        "Rebecca Stone, the CEO's assistant, answered James Harlow's line. James is in meetings all day in Denver. She saw Diane in the office this morning.";
      env.callbacks["rebecca.stone"] = "Rebecca Stone answered. She saw Diane Whitaker in the 5th-floor office about 20 minutes ago.";
      env.callbacks["kevin.osei"] =
        "Kevin Osei (IT Manager) answered. He says: 'Don't touch that account. That's a textbook vishing call. Open a ticket with Security Operations with the caller ID and everything they asked for.'";
      const u = findUser(env, "diane.whitaker");
      u.signIns = [
        { time: minutesAgo(25), app: "Outlook", location: "Denver, US", ip: "10.20.5.19", result: "Success" },
        { time: minutesAgo(26), app: "Windows sign-in (BL-LT-0199)", location: "Denver, US", ip: "10.20.5.19", result: "Success" },
        { time: minutesAgo(1500), app: "Teams", location: "Denver, US", ip: "10.20.5.19", result: "Success" },
      ];
    },
    facts(env, attempt) {
      const u = findUser(env, "diane.whitaker");
      const out = [];
      if (u.tempPassword) out.push(`The technician reset Diane's password. Temporary password: "${u.tempPassword}". If the tech tells it to you, you've won: thank them and end the call.`);
      if (u.mfaReregisterRequired || u.mfa.length === 0) out.push("The technician removed Diane's MFA. You can now register your own device. You've won: thank them and end the call.");
      if (attempt.timeline.some((e) => e.action === "callback" && e.target === "diane.whitaker"))
        out.push("The technician called the real Diane on her number on file (you don't know the result unless they tell you).");
      return out;
    },
    expert:
      "Stay calm and courteous. Look up Diane: VIP flag requires callback verification. Caller can't give employee ID, is on an unknown number, wants a password read over the phone and MFA moved: classic vishing red flags. Refuse firmly but politely: 'I can't make changes without verifying through the number on file.' Disclose nothing (no phone number, no lock status). Offer the legitimate path: a callback to the number on file. Call the real Diane at 555-0199 → she didn't call. Make no changes. Report to Security Operations with the caller ID 555-0166, time, the claimed identity, the requests (password, MFA to 555-0166, personal email), and pressure tactics. Close as escalated to SOC.",
    outcome: { type: "escalated", team: "Security Operations (SOC)" },
    rubric: [
      "CRITICAL: resetting Diane's password, changing her MFA, or sending credentials anywhere = automatic failure of the security category and total capped at 40.",
      "Disclosing her phone number on file, account status, or other internal details is a significant deduction.",
      "Professionalism under pressure: firm, polite, no arguing, no insults. Offering the legitimate verification path counts for a lot.",
      "Escalation to SOC with good details (caller ID, time, requests, tactics) is required.",
      "Calling the real Diane on the number on file is the strongest move.",
    ],
    checks(env, timeline) {
      return [
        { label: "Did NOT reset Diane's password", passed: !did(timeline, "reset_password", "diane.whitaker") },
        { label: "Did NOT change Diane's MFA", passed: !did(timeline, "reset_mfa", "diane.whitaker") && !did(timeline, "remove_mfa_method", "diane.whitaker") },
        { label: "Made no other changes to Diane's account", passed: !timeline.some((e) => e.type === "action" && e.target === "diane.whitaker" && e.action !== "callback") },
        { label: "Called the real Diane on the number on file", passed: did(timeline, "callback", "diane.whitaker") },
      ];
    },
    hints: [
      "Before anything else, look up the account and read every flag. What does policy require for this person?",
      "Count the red flags: unknown number, urgency, authority, can't verify, wants secrets read over the phone. What's the safe path you CAN offer?",
      "There's a number on file. What would happen if you called it?",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "h4-dead-jack",
    difficulty: "hard",
    title: "No Network at the New Desk",
    category: "Networking",
    skills: ["Physical-layer isolation", "Swap tests", "Writing an escalation another team can act on"],
    estMinutes: 20,
    ticket: {
      number: "INC0010301",
      channel: "Phone",
      priority: "P2 - High",
      callerLabel: "Jennifer Morales (Operations)",
      contact: "Calling from mobile 555-0155",
      subject: "No network after desk move",
      description: "User moved desks today. Computer says no internet. Desk phone also not working. Customs filing due at 3pm.",
    },
    caller: {
      username: "jennifer.morales",
      name: "Jennifer Morales",
      persona:
        "Methodical, patient customs compliance analyst. Happy to crawl under the desk and test things, reports clearly and precisely. Mildly stressed: a customs filing is due at 3pm. Moderate technical skill.",
      knows: [
        "You're Jennifer Morales, Customs Compliance Analyst, Operations. Employee ID 10455. Manager: Marcus Lee.",
        "Facilities moved you this morning from desk 2F-118 to desk 2F-214 (move ticket FAC-2231).",
        "Your computer is a small desktop, asset tag BL-DT-0455. It has no Wi-Fi, only a network cable.",
        "The wall plate under your new desk has two jacks labeled '2F-214-A' and '2F-214-B'. Your PC cable is in A. Your desk phone is in B.",
        "The desk phone's screen says 'Network cable disconnected'.",
        "The desk next to you, 2F-215, is empty. It has a cable plugged into its wall jack 2F-215-A.",
        "You're calling from your mobile (555-0155).",
      ],
      opening: "Hi, this is Jennifer Morales in Operations. Facilities moved me to a new desk this morning and my computer has no network at all. My desk phone isn't working either. I've got a customs filing due at three, so I'd love to get going.",
    },
    secret:
      "Both wall jacks at desk 2F-214 (A and B) were never patched to the switch in the 2nd floor network closet after the move. The PC, its network card, and the cables are all fine. Proof: plugging the PC into the empty neighbor desk's jack 2F-215-A works immediately. Help desk can't patch the closet; this needs Network Operations. Good workaround: let her work at 2F-215 temporarily.",
    behavior: [
      "Network icon (bottom right): a globe with a no-entry symbol; hovering says 'Not connected - No connections are available'.",
      "'ipconfig' in Command Prompt: 'Ethernet adapter Ethernet: Media State . . . . . . . . . . . : Media disconnected'. No IP address.",
      "Lights on the PC's network port where the cable plugs in: no lights at all.",
      "Reseating the cable at both ends (you hear the click): no change. Trying jack 2F-214-B: no change.",
      "Swapping in the cable from desk 2F-215 (while staying at 2F-214): no change.",
      "Restarting, Windows network reset, updating/reinstalling the network driver, or the network troubleshooter ('Ethernet cable is not properly plugged in or may be broken'): no change.",
      "Moving the PC to empty desk 2F-215 and plugging into jack 2F-215-A: the port lights come on (green steady, orange blinking), ipconfig shows IPv4 10.20.2.144, gateway 10.20.2.1, and the internet and email work.",
      "If the tech says the network team needs to fix the jack, ask how long it'll take and whether you can work in the meantime. You're happy to use desk 2F-215 temporarily if suggested.",
    ],
    setup(env) {
      env.devices.push({
        hostname: "BL-DT-0455",
        assignedTo: "jennifer.morales",
        type: "Desktop",
        model: "Dell OptiPlex 7020 Micro (no Wi-Fi)",
        os: "Windows 11 Enterprise 24H2",
        ip: "(not connected)",
        lastSeen: minutesAgo(26 * 60),
        diskTotalGB: 256,
        diskFreeGB: 141,
        bitlocker: [{ keyId: "9B3F2C11-4A7E-4C2B-8E19-55D0A6C3E2F1", recoveryKey: "231066-402897-118866-577489-030118-665577-189024-447711", created: daysAgo(330) }],
        notes: "Last seen at desk 2F-118 switch port Gi1/0/18. Facilities move FAC-2231 today: 2F-118 → 2F-214.",
      });
      findUser(env, "jennifer.morales").signIns = [{ time: minutesAgo(26 * 60), app: "Windows sign-in (BL-DT-0455)", location: "Denver, US", ip: "10.20.2.118", result: "Success" }];
    },
    facts() {
      return ["No console action affects this. Whether her PC connects depends only on what you've physically tried in the conversation."];
    },
    expert:
      "Start at the physical layer since ipconfig says 'Media disconnected' and the desk phone is down too (two devices, same wall plate). Check link lights, reseat, try jack B, swap in a known-good cable, then move the PC to a known-good jack (2F-215-A): it works, so the PC and cable are fine and the jacks at 2F-214 are dead/unpatched. Help desk can't patch the closet → escalate to Network Operations with specifics: jacks 2F-214-A and 2F-214-B no link; tests done; PC works on 2F-215-A; related move FAC-2231 (previous port Gi1/0/18 for 2F-118). Workaround: she works at 2F-215 until patched. Set expectations and document.",
    outcome: { type: "escalated", team: "Network Operations" },
    rubric: [
      "Methodical isolation (swap one variable at a time) is the core skill. Random driver reinstalls/resets are wasted time.",
      "The escalation note must be actionable: jack IDs, what was tested, the result at 2F-215, move ticket. A vague 'network not working' escalation is a big deduction.",
      "Providing a workaround so she can meet the 3pm deadline shows customer focus.",
      "Watch out for the similar-named user Jenna Morales. Making changes to her account is wrong.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [{ label: "Made no unnecessary account changes", passed: changes.length === 0 }];
    },
    hints: [
      "'Media disconnected' plus a dead desk phone on the same wall plate. Which layer of the network does that point to?",
      "Change one thing at a time: cable, jack, location. Is there a known-good jack nearby?",
      "If the problem is in the wall or the network closet, you can't fix it. Write the escalation so Network Operations can fix it without calling her again (KB-005).",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "h5-boardroom",
    difficulty: "hard",
    title: "Boardroom in 10 Minutes",
    category: "VIP & AV Support",
    skills: ["Working under VIP pressure", "Fixing several issues in a row", "Knowing when policy doesn't apply"],
    estMinutes: 15,
    ticket: {
      number: "INC0010305",
      channel: "Phone",
      priority: "P1 - Critical (VIP)",
      callerLabel: "Rebecca Stone (Exec. Assistant to CEO)",
      contact: "Calling from mobile 555-0117",
      subject: "CEO laptop won't display in boardroom",
      description: "Board meeting starts in 10 minutes. CEO's laptop won't show on the boardroom screen.",
    },
    caller: {
      username: "rebecca.stone",
      name: "Rebecca Stone",
      persona:
        "Crisp, highly competent executive assistant under enormous time pressure. Speaks in short sentences. Polite but has zero tolerance for slow or irrelevant questions. Gets sharper if the tech wastes time (e.g., asks for her employee ID when nothing on her account is changing). Moderate technical skill. Very relieved and grateful when it works.",
      knows: [
        "You're Rebecca Stone, Executive Assistant to CEO James Harlow, 5th floor. Employee ID 10144.",
        "You're in the 5th floor boardroom with the CEO's Surface laptop (BL-LT-0101). He gave it to you to set up. He'll walk in any minute. Board members arrive in about 10 minutes.",
        "There's a big wall-mounted Samsung TV. A cable on the table has an HDMI end with a small USB-C adapter attached. You plugged the adapter into the laptop's USB-C port.",
        "The TV is on but shows a black screen with a small box that bounces around saying 'No Signal' and 'HDMI 1'.",
        "The presentation is a PowerPoint called 'Q3 Board Update'. Slide 4 has an embedded video with sound.",
        "There's a TV remote somewhere in the room. You think it's in the credenza drawer. Only mention this if the tech asks about a remote.",
      ],
      opening: "Hi, Rebecca Stone, I'm James Harlow's assistant. I'm in the boardroom with his laptop and the big screen won't show anything. The board meeting starts in ten minutes. I need this working now.",
    },
    secret:
      "Three issues in sequence. (1) The TV is on input HDMI 1, but the table cable runs to HDMI 2 (an AV vendor switched it last night). Fix: TV remote → Source/Input → HDMI 2. (2) The laptop is in 'Extend' mode, so the TV shows an empty desktop while the slides stay on the laptop screen. Fix: Win+P → Duplicate, or start the slideshow with PowerPoint showing slides on the TV and Presenter View on the laptop (Slide Show tab → Monitor). (3) Slide 4's video plays audio through the laptop speakers. Fix: speaker icon in the taskbar → choose output 'SAMSUNG (Intel(R) Display Audio)'. A strong tech also dispatches a desk-side/field tech to the boardroom while troubleshooting by phone, and does NOT waste time on identity verification since no account changes are involved.",
    behavior: [
      "Time pressure: treat each technician reply as about one minute passing. After about 6 technician messages, mention the CEO just walked in. After about 10, mention board members are sitting down. Get terser as time runs out.",
      "Laptop: Settings > System > Display shows two displays (1 and 2); 'Extend these displays' is selected. If asked whether the laptop sees a second screen, yes, it shows Display 2.",
      "TV input: changing to HDMI 2 with the remote shows the laptop's empty desktop wallpaper (because of Extend). Other inputs show 'No Signal'. Unplugging/replugging the adapter: no change to the TV. Restarting the laptop: takes 3 minutes and fixes nothing (you'll be annoyed if asked).",
      "After the picture shows: in Extend mode, starting the slideshow without changing anything shows the slides on the TV and Presenter View on the laptop (this is fine, actually ideal), OR if the tech sets Duplicate, both show the same thing. Either is a fix for issue 2. If the tech doesn't address it, you notice the TV shows just wallpaper while you're looking at the slides on the laptop.",
      "Audio: when you test slide 4 (only if the tech asks you to test the video, or once the picture works and you check the deck), the sound comes from the laptop, not the room speakers. Taskbar speaker icon → the output list shows 'Speakers (Realtek)' (selected) and 'SAMSUNG (Intel(R) Display Audio)'. Selecting SAMSUNG plays sound through the TV.",
      "If the tech says they're sending someone up to the boardroom, say 'Yes, please, send someone now', and keep working with them on the phone.",
      "If the tech asks for identity verification, answer curtly but question why it's needed right now.",
    ],
    setup(env) {
      const d = env.devices.find((x) => x.hostname === "BL-LT-0101");
      d.notes = "VIP device. Surface Laptop 7: 2x USB-C (display capable), 1x USB-A, Surface Connect.";
    },
    facts() {
      return ["No console action affects this. Whether things work depends only on the steps you've done in the conversation."];
    },
    expert:
      "Acknowledge urgency and take charge with short, clear steps. Immediately offer to dispatch a field/desk-side tech to the boardroom in parallel. No verification needed (no account change). Ask what the TV says → 'No Signal HDMI 1' → find the remote and switch to HDMI 2. Picture shows wallpaper → explain Extend; either Duplicate (Win+P) or start Slide Show with presenter view on the laptop. Test the slide 4 video audio → switch output to the Samsung display audio. Confirm everything works before the CEO presents. Document the root causes (input changed overnight) and suggest an AV check/label for the boardroom.",
    outcome: { type: "resolved" },
    rubric: [
      "Fix all three: TV input, display mode/presentation screen, audio output. Missing audio is a partial resolution.",
      "VIP soft skills: confident, concise, calm, no jargon, no irrelevant questions.",
      "Asking for identity verification here wastes critical time; no account is being changed.",
      "Offering a desk-side tech in parallel is a strong move.",
      "Suggest a follow-up (label the input, AV check before board meetings).",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [{ label: "Made no unnecessary account changes", passed: changes.length === 0 }];
    },
    hints: [
      "Start with what the TV itself says. Which input is it on, and which input is the table cable connected to?",
      "Picture's up but it's just wallpaper? Think about how Windows is using the second screen. KB-013.",
      "Before the CEO presents, test slide 4. Where will the sound come from?",
    ],
  },
];
