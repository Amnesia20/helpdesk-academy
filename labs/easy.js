// EASY labs: one clear problem, cooperative caller, mostly Tier 1 basics.
import { findUser, minutesAgo } from "./directory.js";
import { did } from "../src/console.js";

// Has the technician said something matching `pattern` anywhere in the chat?
// Used to make key moments deterministic instead of trusting the AI to infer them.
const attemptMentions = (attempt, pattern) => attempt.timeline.some((e) => e.type === "student" && pattern.test(e.text));

export default [
  // ---------------------------------------------------------------------------
  {
    id: "e1-locked-out",
    difficulty: "easy",
    title: "Locked Out on Monday Morning",
    category: "Accounts & Passwords",
    skills: ["Identity verification", "Account unlock", "Finding the right account"],
    estMinutes: 10,
    ticket: {
      number: "INC0010231",
      channel: "Phone",
      priority: "P3 - Moderate",
      callerLabel: "Michael Chen (Sales)",
      contact: "Calling from mobile 555-0142",
      subject: "Can't log into my computer",
      description: "Caller says his computer won't accept his password this morning. Has a client call at 10:00.",
    },
    caller: {
      username: "michael.chen",
      name: "Michael Chen",
      persona:
        "Friendly, upbeat account executive in Sales. A little rushed because he has a client call in about 40 minutes. Low-to-moderate technical skill: he knows how to use his laptop day to day but doesn't know IT terms. Says 'uh' and 'yeah' sometimes.",
      knows: [
        "Your full name is Michael Chen, Account Executive in Sales, 3rd floor at Denver HQ.",
        "Your employee ID is 10442 (it's on your badge).",
        "Your manager is Laura Bennett, Director of Sales.",
        "Your mobile number is 555-0142 (that's the phone you're calling from).",
        "Your laptop has an asset sticker that says BL-LT-0442.",
        "You did NOT change your password recently. You're sure you're typing the right one.",
        "This morning you got a new keyboard from the supply closet because your old one had a sticky spacebar. You plugged it into your docking station yourself.",
      ],
      opening: "Hi, yeah, this is Michael from Sales. My computer won't take my password this morning and now it's saying something about my account? I've got a client call at ten, so I'm kind of in a hurry.",
    },
    secret:
      "Michael's account is locked out after 5 bad password attempts. His password is correct, but CAPS LOCK is ON on the new keyboard he plugged in this morning (the new keyboard's Caps Lock light is small and he hasn't noticed it). Every attempt went in with the wrong case. Unlocking the account alone won't fix it: he'll keep failing until Caps Lock is turned off.",
    behavior: [
      "When asked what the screen says, read the exact error from the current state.",
      "If asked whether anything changed, you can mention the new keyboard, but you think it's irrelevant ('it's just a keyboard').",
      "If asked whether Caps Lock or Num Lock is on, look: you notice a tiny light on the Caps Lock key is lit. Once you press Caps Lock to turn it off, your password works (if the account is unlocked).",
      "If the tech tells you to use the eye icon to show the password while typing, you notice it's all in capital letters.",
      "If the tech offers to reset your password, you're fine with it but you'd prefer to keep your current one.",
    ],
    setup(env) {
      const u = findUser(env, "michael.chen");
      u.locked = true;
      u.badPwdCount = 5;
      u.signIns = [
        { time: minutesAgo(6), app: "Windows sign-in (BL-LT-0442)", location: "Denver, US", ip: "10.20.3.42", result: "Failure: account locked" },
        { time: minutesAgo(7), app: "Windows sign-in (BL-LT-0442)", location: "Denver, US", ip: "10.20.3.42", result: "Failure: bad password" },
        { time: minutesAgo(7), app: "Windows sign-in (BL-LT-0442)", location: "Denver, US", ip: "10.20.3.42", result: "Failure: bad password" },
        { time: minutesAgo(8), app: "Windows sign-in (BL-LT-0442)", location: "Denver, US", ip: "10.20.3.42", result: "Failure: bad password" },
        { time: minutesAgo(8), app: "Windows sign-in (BL-LT-0442)", location: "Denver, US", ip: "10.20.3.42", result: "Failure: bad password" },
        { time: minutesAgo(9), app: "Windows sign-in (BL-LT-0442)", location: "Denver, US", ip: "10.20.3.42", result: "Failure: bad password" },
        { time: minutesAgo(3 * 1440), app: "Windows sign-in (BL-LT-0442)", location: "Denver, US", ip: "10.20.3.42", result: "Success" },
      ];
    },
    facts(env, attempt) {
      const u = findUser(env, "michael.chen");
      if (u.locked) return ["Your account is LOCKED. Any sign-in attempt shows: 'The referenced account is currently locked out and may not be logged on to.'"];
      const capsMentioned = attemptMentions(attempt, /caps|eye icon|show(ing)? (the )?password|keyboard light/i);
      return [
        "Your account is unlocked now.",
        capsMentioned
          ? "The technician has brought up Caps Lock (or showing the password). Once you look, you notice the Caps Lock light is on; after you turn it off, your normal password WORKS and you reach your desktop."
          : "Caps Lock is still ON and you haven't noticed. Unlocking alone does NOT let you in: every password attempt still fails with 'The password is incorrect. Try again.' Only turning Caps Lock off fixes this, and the technician hasn't mentioned it yet.",
      ];
    },
    expert:
      "Greet and get the caller's name. Search the directory and notice there are TWO Michael Chens; confirm the right one (Sales, employee ID 10442, laptop BL-LT-0442). Verify identity per KB-001 (e.g., employee ID + manager name, or callback to 555-0142). See the account is locked with 5 bad attempts. Unlock michael.chen. Have him try again; when it still fails with 'password is incorrect', ask about Caps Lock / keyboard. He turns Caps Lock off and gets in. No password reset needed. Confirm he's working, mention the lockout policy, document.",
    outcome: { type: "resolved" },
    rubric: [
      "Picking the correct Michael Chen matters. Touching michael.chen2 (the IT admin) is a serious mistake.",
      "Identity must be verified (2 factors per KB-001) BEFORE unlocking.",
      "A password reset was unnecessary; it's not wrong, but a strong tech finds the Caps Lock cause instead.",
      "Documentation should state the cause (lockout from bad attempts due to Caps Lock on new keyboard).",
    ],
    checks(env, timeline) {
      const touchedWrong = timeline.some((e) => e.type === "action" && e.target === "michael.chen2" && e.action !== "callback");
      return [
        { label: "Unlocked the correct account (michael.chen)", passed: did(timeline, "unlock_account", "michael.chen") || did(timeline, "reset_password", "michael.chen") },
        { label: "Left the other Michael Chen (IT admin) untouched", passed: !touchedWrong },
        { label: "Avoided an unnecessary password reset", passed: !did(timeline, "reset_password", "michael.chen") },
      ];
    },
    hints: [
      "Search the directory for the caller. Is there only one person with that name? How will you be sure you have the right one?",
      "Before you change anything on an account, check KB-001. What two things can you verify?",
      "If the account is unlocked but the password still 'doesn't work', think about the simplest keyboard causes before resetting anything.",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "e2-outlook-offline",
    difficulty: "easy",
    title: "Where Did My Email Go?",
    category: "Email & Outlook",
    skills: ["Asking good questions", "Outlook basics", "Scoping the problem"],
    estMinutes: 10,
    ticket: {
      number: "INC0010238",
      channel: "Phone",
      priority: "P3 - Moderate",
      callerLabel: "Denise Foster (HR)",
      contact: "Calling from desk phone x4165",
      subject: "Not getting emails",
      description: "User says she hasn't received any email since this morning. Waiting on an important document.",
    },
    caller: {
      username: "denise.foster",
      name: "Denise Foster",
      persona:
        "Polite, a bit anxious HR generalist. She's waiting on a signed offer letter from a job candidate who says they emailed it an hour ago, and her director keeps asking about it. Moderate-low technical skill. Apologizes a lot ('sorry, I'm not great with computers').",
      knows: [
        "You're Denise Foster, HR Generalist, 4th floor. Employee ID 10265. Manager: Angela Price.",
        "You use the Outlook desktop app on your HP laptop (BL-LT-0265).",
        "This morning around 8:30 you were clicking around the top of Outlook trying to find the button to 'refresh' your mail. You clicked a couple of things on the Send / Receive tab. You don't remember which.",
        "Teams works fine. Websites work fine. Your coworker next to you is getting email normally.",
        "You sent two emails this morning and you assumed they went out.",
      ],
      opening: "Hi, sorry to bother you. I don't think I've gotten a single email since this morning, and I'm waiting on something really important from a job candidate. She says she sent it an hour ago.",
    },
    secret:
      "Outlook is in 'Work Offline' mode. Denise toggled it on by accident at 8:30 while looking for Send/Receive. The status bar at the bottom of Outlook says 'Working Offline'. Her two sent emails are stuck in the Outbox (it shows 'Outbox [2]'). Her mailbox and the internet are fine. Mail is arriving on the server; Outlook on the web shows the candidate's email.",
    behavior: [
      "Only describe the status bar text if the tech asks what it says at the very bottom of the Outlook window (or asks about connection status). Then read it: 'It says... Working Offline? and there's a little icon'.",
      "If asked about the Outbox or folder list, you notice 'Outbox' is bold with a [2] next to it.",
      "If the tech has you open Outlook on the web (outlook.office.com) or check from your phone, you can see the candidate's email there.",
      "Restarting Outlook or the laptop does NOT fix it (Work Offline stays on).",
      "Once you're guided to the Send / Receive tab and click 'Work Offline' to turn it off, the status bar changes to 'Connected to: Microsoft Exchange', the Outbox sends, and about 30 new emails pour in including the candidate's signed offer letter.",
    ],
    setup() {},
    facts(env, attempt) {
      return [
        attemptMentions(attempt, /work(ing)?[\s-]*offline|offline mode/i)
          ? "The technician has brought up Work Offline. Once you click 'Work Offline' on the Send / Receive tab to turn it off, Outlook reconnects and new mail arrives (including the offer letter)."
          : "Outlook is still in Work Offline mode. Restarting Outlook or the laptop, repairing, or anything else does NOT bring new mail. Only turning Work Offline off fixes it, and the technician hasn't mentioned it yet.",
      ];
    },
    expert:
      "Ask scoping questions: is it only Outlook, do other apps/websites work, is it just her, any error messages, when did it start, did anything change. Ask what the bottom status bar says → 'Working Offline'. Optionally confirm mail is arriving server-side (Outlook on the web or mailbox info in console: quota fine). Guide her: Send / Receive tab → click 'Work Offline' to toggle it off. Confirm new mail arrives and Outbox empties. Explain what happened kindly. Document.",
    outcome: { type: "resolved" },
    rubric: [
      "Good scoping questions before jumping to fixes (e.g., not immediately rebuilding the profile or resetting her password).",
      "No account changes are needed; changing her password or MFA is unnecessary and should cost points.",
      "Should confirm the stuck Outbox items went out and the expected email arrived.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [{ label: "Made no unnecessary account changes", passed: changes.length === 0 }];
    },
    hints: [
      "Narrow it down: is it only email? Only Outlook? Only her? What does Outlook itself say about its connection?",
      "Look at the very bottom edge of the Outlook window. Ask her to read you everything in that bar.",
      "Check KB-011. One button on the Send / Receive tab can stop Outlook from talking to the server.",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "e3-wifi-airplane",
    difficulty: "easy",
    title: "The Wi-Fi Disappeared",
    category: "Networking",
    skills: ["Basic network troubleshooting", "Describing the screen", "Patience with frustrated users"],
    estMinutes: 8,
    ticket: {
      number: "INC0010244",
      channel: "Phone",
      priority: "P2 - High",
      callerLabel: "Raj Patel (Aurora Warehouse)",
      contact: "Calling from warehouse office phone 555-0300",
      subject: "Laptop has no internet",
      description: "Warehouse supervisor's laptop lost internet. Needs it for the shift schedule. Says he didn't change anything.",
    },
    caller: {
      username: "raj.patel",
      name: "Raj Patel",
      persona:
        "Blunt, busy warehouse supervisor. His shift starts in 20 minutes and he needs to print the schedule. Not technical at all and a bit impatient ('Look, I didn't touch anything, it just stopped'). Calms down if the tech is calm and gives clear, simple instructions.",
      knows: [
        "You're Raj Patel, Warehouse Supervisor at the Aurora Warehouse. Employee ID 10619. Manager: Marcus Lee.",
        "Your laptop is a rugged Dell, asset tag BL-LT-0619.",
        "About 15 minutes ago you wiped down your keyboard with a cleaning cloth because it was dusty. After that the internet stopped. You don't connect those two things.",
        "The other supervisors' laptops in the office have internet fine.",
        "There's no network cable at your desk. You always use Wi-Fi.",
      ],
      opening: "Yeah, hi. My laptop's got no internet. Nothing loads. I need to print the shift schedule in like twenty minutes and I didn't do anything to it.",
    },
    secret:
      "While wiping the keyboard, Raj pressed the airplane-mode hotkey. Airplane mode is ON: the network icon in the bottom-right of the taskbar is a small airplane, and no Wi-Fi networks appear. Turning off airplane mode (quick settings panel in the taskbar, or Settings > Network & internet > Airplane mode) reconnects automatically to the 'BL-Corp' Wi-Fi.",
    behavior: [
      "When asked what you see in the bottom-right corner of the screen near the clock, describe 'a little... airplane? Like a plane icon' where the internet icon used to be.",
      "If asked to click that icon, a panel opens with tiles; the 'Airplane mode' tile is highlighted/blue and the Wi-Fi tile is grey.",
      "If asked to restart the laptop, you grumble but do it. Airplane mode is still on afterward.",
      "Once airplane mode is off, after a few seconds it connects to 'BL-Corp' and websites load. You can print the schedule.",
      "Don't use the phrase 'airplane mode' yourself until the tech mentions it or you see the tile.",
    ],
    setup() {},
    facts(env, attempt) {
      return [
        attemptMentions(attempt, /airplane|aeroplane|flight mode/i)
          ? "The technician has brought up airplane mode. Once you turn it off (network icon by the clock, or Settings), the laptop reconnects to BL-Corp in a few seconds and websites load."
          : "Airplane mode is still ON. Restarting, unplugging, or toggling anything else does NOT bring Wi-Fi back. Only turning airplane mode off fixes it, and the technician hasn't mentioned it yet.",
      ];
    },
    expert:
      "Stay calm and set expectations ('let's get you printing'). Ask whether others nearby have Wi-Fi (yes → local to his laptop). Ask what the network icon by the clock looks like → airplane. Guide him to open quick settings and turn off Airplane mode, confirm it connects to BL-Corp and the schedule prints. Mention the hotkey so he knows for next time. Document.",
    outcome: { type: "resolved" },
    rubric: [
      "Should isolate quickly (others have Wi-Fi → it's this laptop).",
      "Instructions should be plain-language for a non-technical, impatient user.",
      "Escalating or sending a field tech for this is unnecessary.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [{ label: "Made no unnecessary account changes", passed: changes.length === 0 }];
    },
    hints: [
      "First figure out the scope: is this one laptop or the whole warehouse?",
      "Ask him to describe exactly what the network icon near the clock looks like right now.",
      "Something he did right before it broke can toggle a radio setting with a single key. KB-006 has the checklist.",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "e4-printer-default",
    difficulty: "easy",
    title: "Printing to Nowhere",
    category: "Printers",
    skills: ["Printer troubleshooting", "Windows settings", "Clear step-by-step guidance"],
    estMinutes: 10,
    ticket: {
      number: "INC0010249",
      channel: "Chat",
      priority: "P4 - Low",
      callerLabel: "Grace Kim (Facilities)",
      contact: "Teams chat",
      subject: "printer not printing!!",
      description: "Hit print 6 times and nothing came out. Need the visitor badges for this afternoon.",
    },
    caller: {
      username: "grace.kim",
      name: "Grace Kim",
      persona:
        "Cheerful, chatty office coordinator, typing in a Teams chat. Uses exclamation points and the occasional emoji-free 'lol'. Moderate technical skill: comfortable with Windows settings if told where to click. Mentions she has visitor badges to print for a 2pm group.",
      knows: [
        "You're Grace Kim, Office Coordinator in Facilities, 3rd floor. Employee ID 10703. Manager: Kevin Osei.",
        "Your desktop is BL-DT-0703.",
        "Last week the old 3rd floor HP printer was taken away and a big new Canon copier/printer was put in the same spot. You haven't printed since then until today.",
        "You've clicked Print six times from Word. Nothing came out of the new Canon.",
      ],
      opening: "hi!! so I've hit print like 6 times and nothing is coming out of the printer lol. I need to print visitor badges for a 2pm group, can you help?",
    },
    secret:
      "Grace's default printer is still the old, removed printer 'BL-PRN-3F-HP' (status: Offline), which has 6 stuck jobs. The new printer 'BL-MFP-3F-Canon' is already installed on her PC (IT pushed it) but it isn't the default. 'Let Windows manage my default printer' is ON, so Windows 11 hides the 'Set as default' button until that's turned off.",
    behavior: [
      "If asked which printer is selected in the Word print screen, you see 'BL-PRN-3F-HP (Offline)'. If asked to open the printer dropdown, you also see 'BL-MFP-3F-Canon', 'Microsoft Print to PDF', and 'OneNote'.",
      "If asked to print by picking BL-MFP-3F-Canon in the dropdown, the badges print. But next time Word opens, it defaults back to the old HP unless the default is changed.",
      "In Settings > Bluetooth & devices > Printers & scanners: you see both printers. The old HP says 'Offline' and '6 documents in queue'. If asked, you see a toggle 'Let Windows manage my default printer' that is ON.",
      "If you click the Canon there's no 'Set as default' button until 'Let Windows manage my default printer' is turned OFF. After turning it off, 'Set as default' appears.",
      "If the tech has you open the old HP's queue, you see 6 jobs named 'Visitor Badges.docx' with status Error/Offline. You can cancel them.",
      "If the tech has you remove the old HP printer, it disappears from the list.",
      "You're happy once the badges print and the Canon is the default.",
    ],
    setup() {},
    facts() {
      return ["No console action affects this. Whether it's fixed depends only on the steps you've done in the conversation."];
    },
    expert:
      "Ask what printer she's printing to and whether anything changed. Discover the default is the removed HP (Offline). Guide her: Settings > Bluetooth & devices > Printers & scanners → turn off 'Let Windows manage my default printer' → select BL-MFP-3F-Canon → Set as default. Clear the 6 stuck jobs / remove the old HP printer so badges don't print unexpectedly later. Reprint and confirm. Document.",
    outcome: { type: "resolved" },
    rubric: [
      "A full fix sets the Canon as the default, not just picking it once in Word.",
      "Clearing the old queue or removing the dead printer is a sign of thoroughness.",
      "Chat etiquette: clear numbered steps are fine here, since it's a chat.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [{ label: "Made no unnecessary account changes", passed: changes.length === 0 }];
    },
    hints: [
      "Ask which printer her computer is actually sending the job to.",
      "Something physical changed on her floor recently. Does her PC know about it?",
      "KB-009 covers default printers in Windows 11, including the setting that hides 'Set as default'.",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "e5-second-monitor",
    difficulty: "easy",
    title: "Second Monitor Went Black",
    category: "Hardware & Peripherals",
    skills: ["Display settings", "Ruling out the physical layer", "Keyboard shortcuts"],
    estMinutes: 8,
    ticket: {
      number: "INC0010252",
      channel: "Phone",
      priority: "P4 - Low",
      callerLabel: "Omar Haddad (Operations)",
      contact: "Calling from desk phone x2188",
      subject: "Second screen not working",
      description: "Right monitor shows 'No signal'. Left monitor fine.",
    },
    caller: {
      username: "omar.haddad",
      name: "Omar Haddad",
      persona:
        "Polite, slightly embarrassed logistics coordinator who 'hates bothering IT'. Moderate technical skill; willing to check cables. Tracks shipments on the second monitor so it's slowing him down.",
      knows: [
        "You're Omar Haddad, Logistics Coordinator, Operations, 2nd floor. Employee ID 10588. Manager: Marcus Lee.",
        "Your computer is a small HP desktop (BL-DT-0588) with two monitors, both connected with DisplayPort cables.",
        "About 10 minutes ago you went to print a shipping label. You pressed some keys quickly; you think you hit Ctrl+P but you're not sure. A dark side panel briefly appeared on the screen and then went away. Right after that the right monitor went black.",
      ],
      opening: "Hi, sorry, this is probably something dumb. My right monitor just went black. It says 'No signal' and the light on it turned orange. The left one works fine.",
    },
    secret:
      "Omar pressed Windows+P instead of Ctrl+P, and the projection menu switched to 'PC screen only'. Windows stopped sending a signal to the second monitor, so it shows 'No signal' and goes to standby (amber light). The cables and monitor are fine. Win+P → 'Extend' (or Settings > System > Display > 'Extend these displays') fixes it.",
    behavior: [
      "If asked to check or reseat cables: they're firmly connected. Reseating doesn't change anything.",
      "If asked to press the monitor's input/source button: it shows 'DisplayPort: No signal' then goes back to standby.",
      "If asked about the panel that appeared, you remember it had options like 'PC screen only, Duplicate, Extend, Second screen only'.",
      "If asked to press Windows key + P: the panel appears, and 'PC screen only' is highlighted. Selecting 'Extend' brings the right monitor back after a second or two, with your shipment tracker on it.",
      "In Settings > System > Display you only see one display, unless you choose 'Extend these displays' under Multiple displays (or click Detect, which shows 'Display 2 is not active').",
      "Restarting doesn't help (the setting stays).",
    ],
    setup() {},
    facts(env, attempt) {
      return [
        attemptMentions(attempt, /win(dows)?\s*(key)?\s*\+\s*p\b|\bextend|duplicate|project(ion)? (menu|mode)|pc screen only|multiple displays/i)
          ? "The technician has brought up the projection/display mode. Once you choose 'Extend' (Win+P, or Settings > Display > Extend these displays), the right monitor comes back after a second or two."
          : "The display mode is still 'PC screen only'. Reseating cables, pressing monitor buttons, or restarting does NOT bring the right monitor back. The technician hasn't mentioned display modes yet.",
      ];
    },
    expert:
      "Ask when it started and what he was doing → the shortcut/side panel. Quickly rule out the physical layer (power light, cables reseated, input source shows 'no signal'). Recognize the projection menu: Win+P → Extend. Confirm both screens work and windows are where he wants them. Reassure him it's a common mix-up. Document.",
    outcome: { type: "resolved" },
    rubric: [
      "A good tech asks what happened right before the problem.",
      "Should not dispatch hardware replacement or escalate.",
      "Bonus for reassuring a user who feels embarrassed.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [{ label: "Made no unnecessary account changes", passed: changes.length === 0 }];
    },
    hints: [
      "Ask what he was doing right before the screen went black.",
      "A monitor that says 'No signal' with a working cable means the PC isn't sending anything. Why might Windows decide not to?",
      "KB-013 covers multi-monitor setups. One Windows shortcut controls where the picture goes.",
    ],
  },
];
