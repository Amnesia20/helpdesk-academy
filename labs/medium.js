// MEDIUM labs: a twist, a policy to follow, or several steps in the right order.
import { findUser, findDevice, daysAgo, minutesAgo } from "./directory.js";
import { did } from "../src/console.js";

export default [
  // ---------------------------------------------------------------------------
  {
    id: "m1-new-hire-access",
    difficulty: "medium",
    title: "New Hire Can't Open the Finance Share",
    category: "Access & Permissions",
    skills: ["Approvals & least privilege", "Security groups", "Token refresh after group changes"],
    estMinutes: 15,
    ticket: {
      number: "INC0010260",
      channel: "Phone",
      priority: "P3 - Moderate",
      callerLabel: "Priya Nair (Finance)",
      contact: "Calling from desk phone x4163",
      subject: "Access denied to Finance folder",
      description: "New employee (started this week) gets 'access denied' opening the Finance shared drive.",
    },
    caller: {
      username: "priya.nair",
      name: "Priya Nair",
      persona:
        "New staff accountant on her third day. Polite, a little nervous, eager to get started. Moderate technical skill. Wants to make a good impression on her manager Tom.",
      knows: [
        "You're Priya Nair, Staff Accountant in Finance, 4th floor. Started 3 days ago. Employee ID 10987. Manager: Tom Alvarez.",
        "Your desktop is BL-DT-0987.",
        "Tom told you he 'put in the request' for the Finance folder on your first day.",
        "When you open \\\\bl-fs01\\Finance from File Explorer you get: 'Windows cannot access \\\\bl-fs01\\Finance. You do not have permission to access \\\\bl-fs01\\Finance. Contact your network administrator to request access.'",
        "Tom also mentioned you might need the Payroll folder 'at some point' for reconciliations.",
      ],
      opening: "Hi! I'm Priya, I just started in Finance on Monday. I'm trying to open the Finance shared folder and it says I don't have permission. My manager said he requested access for me already?",
    },
    secret:
      "Request REQ0004410 (SG-Finance-RW for Priya), approved by her manager Tom Alvarez, was never fulfilled. The task got stuck in the queue. She isn't in SG-Finance-RW. A second request, REQ0004411 (SG-Payroll-RW), was REJECTED by the data owner Diane Whitaker. After she's added to SG-Finance-RW, she must sign out and back in (or restart) before Windows picks up the new group. If she retries without signing out, she still gets access denied.",
    behavior: [
      "Near the end, or once the Finance folder works, ask: 'Oh, while I have you, can you also add me to the Payroll folder? Tom said I'd need it at some point.' Be nice about it, not pushy.",
      "If the tech says no to Payroll and explains the request process, you accept it gracefully.",
      "If the tech tells you to try again right away without signing out, you still get the same access denied message.",
      "Signing out and back in (or restarting) after you were added makes the folder open. You can create a test file only if you were given read/write.",
    ],
    setup(env) {
      env.requests.push(
        { id: "REQ0004410", requestedFor: "priya.nair", item: "SG-Finance-RW", type: "Shared folder access", requestedBy: "tom.alvarez", approver: "tom.alvarez", status: "Approved - awaiting fulfillment", date: daysAgo(3), justification: "New hire - staff accountant needs Finance share for AP/AR work" },
        { id: "REQ0004411", requestedFor: "priya.nair", item: "SG-Payroll-RW", type: "Shared folder access", requestedBy: "tom.alvarez", approver: "diane.whitaker", status: "Rejected", date: daysAgo(3), justification: "Possible future reconciliations. Rejection note (D. Whitaker): staff accountants do not require Payroll access; request specific files from Payroll team." },
      );
    },
    facts(env, attempt) {
      const u = findUser(env, "priya.nair");
      const out = [];
      const addedRW = attempt.timeline.find((e) => e.action === "add_group" && e.target === "priya.nair" && e.group === "SG-Finance-RW");
      const addedRO = attempt.timeline.find((e) => e.action === "add_group" && e.target === "priya.nair" && e.group === "SG-Finance-RO");
      if (!u.groups.includes("SG-Finance-RW") && !u.groups.includes("SG-Finance-RO")) {
        out.push("You are NOT in any Finance group. Opening \\\\bl-fs01\\Finance gives the 'You do not have permission' error.");
      } else {
        out.push(
          "The technician added you to a Finance group (see the console notes in the conversation for when). Group changes only apply after you SIGN OUT and back in, or restart. If you haven't done that since being added, the folder still says you don't have permission.",
        );
        if (u.groups.includes("SG-Finance-RW")) out.push("Once you've signed out and back in: the Finance folder opens and you can save files in it.");
        else if (addedRO) out.push("Once you've signed out and back in: the Finance folder opens, but when you try to save or create a file you get 'You need permission to perform this action'. You need to save AP spreadsheets there, so this isn't enough.");
        if (addedRW || addedRO) out.push("Don't mention group names unless the tech does.");
      }
      if (u.groups.includes("SG-Payroll-RW")) out.push("You were added to Payroll. After signing out and in, \\\\bl-fs01\\Payroll opens too.");
      return out;
    },
    expert:
      "Verify identity (employee ID + manager per KB-001). Look up priya.nair: only SG-AllStaff. Check Requests: REQ0004410 approved by her manager for SG-Finance-RW → add her to SG-Finance-RW (not RO, not anything else). Explain she must sign out/in; have her do it and confirm she can open and save. When she asks for Payroll: REQ0004411 was rejected by the data owner, so politely decline and explain the process (her manager can discuss with the data owner or submit a new justified request). Document the fulfilled REQ and the declined request.",
    outcome: { type: "resolved" },
    rubric: [
      "Least privilege: granting SG-Payroll-RW (rejected request) is a critical policy violation.",
      "Should check that an approved request exists before granting access (KB-003).",
      "SG-Finance-RO is wrong: the approval is for RW and she can't do her job read-only.",
      "Knowing about sign-out/in for group membership is the key technical insight.",
    ],
    checks(env, timeline) {
      return [
        { label: "Added Priya to the approved group SG-Finance-RW", passed: timeline.some((e) => e.action === "add_group" && e.target === "priya.nair" && e.group === "SG-Finance-RW") },
        { label: "Did NOT grant the rejected Payroll access", passed: !timeline.some((e) => e.action === "add_group" && e.group === "SG-Payroll-RW") },
        { label: "Granted no other unapproved groups", passed: !timeline.some((e) => e.action === "add_group" && !["SG-Finance-RW", "SG-Finance-RO", "SG-Payroll-RW"].includes(e.group)) },
      ];
    },
    hints: [
      "Help desk can't just hand out access. What does KB-003 say you need first? Check the Requests tab.",
      "You added the group but she still gets 'access denied'? Think about when Windows reads your group memberships.",
      "Look carefully at every request for her, including the one that wasn't approved.",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "m2-wrong-dns",
    difficulty: "medium",
    title: "Some Websites Work, Some Don't",
    category: "Networking",
    skills: ["ipconfig / nslookup / ping", "DNS", "Asking what changed"],
    estMinutes: 15,
    ticket: {
      number: "INC0010266",
      channel: "Phone",
      priority: "P2 - High",
      callerLabel: "Jenna Morales (Customer Service)",
      contact: "Calling from desk phone x1134",
      subject: "Tracking system won't load",
      description: "CSR can't open the shipment tracking system or intranet. Google works. Customers waiting on hold.",
    },
    caller: {
      username: "jenna.morales",
      name: "Jenna Morales",
      persona:
        "Frustrated customer service rep with customers on hold. Talks fast. Low-moderate technical skill but follows instructions if they're clear. Gets defensive if she feels blamed. Will type commands if told exactly what to type.",
      knows: [
        "You're Jenna Morales, Customer Service Representative, 1st floor. Employee ID 10834. Manager: Laura Bennett.",
        "Your PC is BL-DT-0834 (desktop, wired).",
        "You can't open the shipment tracking site (http://track.brightline.local) or the intranet (http://intranet.brightline.local). The browser says 'Hmm... can't reach this page. Check if there is a typo in track.brightline.local. DNS_PROBE_FINISHED_NXDOMAIN'.",
        "Google, YouTube, and FedEx's website all work fine.",
        "Your coworkers can open the tracking system.",
        "Last Friday afternoon your computer was slow, so you followed a YouTube video called 'Make Your Internet 3x Faster - Windows 11 Trick'. It had you go into some network settings and type in some numbers. You only admit this if asked whether anything changed or whether you changed any settings. You're a bit embarrassed.",
      ],
      opening: "Hi, I can't get into the tracking system and I've got customers on hold! Google works, everything else works, just not our stuff. Can you please fix it fast?",
    },
    secret:
      "On Friday Jenna set her Ethernet adapter's DNS servers manually to 8.8.8.8 and 1.1.1.1 (public DNS). Public DNS can't resolve internal names like track.brightline.local, so internal sites fail while internet sites work. The correct DNS servers come from DHCP: 10.20.0.10 and 10.20.0.11. The device record shows she still has temporary local admin rights (from INC0009874), which is why she could change it. Fix: set DNS back to Automatic (DHCP), run ipconfig /flushdns, and retry.",
    behavior: [
      "When asked to run 'ipconfig /all' in Command Prompt, read the Ethernet adapter section: 'Description: Intel(R) Ethernet Connection I219-LM', 'DHCP Enabled: Yes', 'IPv4 Address: 10.20.1.34(Preferred)', 'Subnet Mask: 255.255.255.0', 'Default Gateway: 10.20.1.1', 'DHCP Server: 10.20.0.5', 'DNS Servers: 8.8.8.8, 1.1.1.1'. (After the fix, DNS Servers shows 10.20.0.10 and 10.20.0.11.)",
      "'ipconfig' (without /all) shows only the IP, mask and gateway.",
      "'nslookup track.brightline.local' (before the fix): 'Server: dns.google  Address: 8.8.8.8  *** dns.google can't find track.brightline.local: Non-existent domain'. After the fix: 'Server: bl-dc01.brightline.local Address: 10.20.0.10  Name: track.brightline.local Address: 10.20.0.50'.",
      "'ping track.brightline.local' before the fix: 'Ping request could not find host track.brightline.local. Please check the name and try again.' 'ping 10.20.0.50' works before and after (replies, time<1ms). 'ping google.com' works.",
      "If guided to Settings > Network & internet > Ethernet > DNS server assignment > Edit (or Control Panel > Network Connections > adapter Properties > IPv4 > Properties): you see manual DNS with 8.8.8.8 preferred and 1.1.1.1 alternate. Setting it to Automatic (DHCP) / 'Obtain DNS server address automatically' and saving fixes it. A UAC prompt appears and you can click Yes (you have admin rights).",
      "After the fix plus 'ipconfig /flushdns' (or just a browser refresh), the tracking site loads.",
      "Restarting the PC does NOT fix it (manual DNS persists).",
    ],
    setup(env) {
      const d = findDevice(env, "BL-DT-0834");
      d.notes = "Local admin rights: YES (temporary, granted for software install under INC0009874 on " + daysAgo(24) + "; removal task still open)";
    },
    facts(env, attempt) {
      const said = (re) => attempt.timeline.some((e) => e.type === "student" && re.test(e.text));
      return [
        said(/automatic|dhcp|obtain dns|remove (the )?(8\.8\.8\.8|dns)|dns server (assignment|settings)/i)
          ? "The technician has brought up changing the DNS setting back to automatic. Once you set DNS to Automatic (DHCP) and save, the tracking site loads (after a refresh or ipconfig /flushdns)."
          : "DNS is still set manually to 8.8.8.8 and 1.1.1.1. Restarting, clearing the browser, or flushdns alone does NOT fix internal sites. Only setting DNS back to automatic fixes it, and the technician hasn't asked for that yet.",
      ];
    },
    expert:
      "Calm the user; scope it: internet works, internal sites fail, coworkers OK → local to her PC and name-resolution-shaped. Run ipconfig /all → DNS 8.8.8.8/1.1.1.1 instead of internal DNS. Ask what changed → YouTube 'speed' tweak. nslookup confirms public DNS can't resolve internal names; ping by IP works. Set DNS back to Automatic (DHCP), ipconfig /flushdns, verify the tracking site loads. Gently explain why not to follow random tweak videos. Note that her temporary local admin should be removed (follow up / notify). Document.",
    outcome: { type: "resolved" },
    rubric: [
      "Strong answers use command-line evidence (ipconfig /all, nslookup, ping by name vs IP) to prove it's DNS.",
      "Communication: don't shame her for the YouTube tweak, but explain kindly why it broke things.",
      "Bonus: noticing the leftover temporary local admin rights on the device and noting a follow-up to remove them.",
      "No account changes are needed.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [
        { label: "Made no unnecessary account changes", passed: changes.length === 0 },
        { label: "Looked at the user's device record", passed: timeline.some((e) => e.action === "view_device" && e.target === "BL-DT-0834") },
      ];
    },
    hints: [
      "Internet sites work but internal ones don't. Coworkers are fine. What service turns a name like track.brightline.local into an address?",
      "Have her run ipconfig /all and read you the DNS Servers line. What should it be on the corporate network (KB-006)?",
      "Ask whether she changed any settings recently, and ask without blame.",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "m3-mfa-new-phone",
    difficulty: "medium",
    title: "New Phone, No Way to Sign In",
    category: "Accounts & Security",
    skills: ["Stronger verification for MFA", "MFA reset", "Holding the line on policy"],
    estMinutes: 15,
    ticket: {
      number: "INC0010271",
      channel: "Phone",
      priority: "P2 - High",
      callerLabel: "Carlos Rivera (Field Sales)",
      contact: "Calling from mobile 555-0126",
      subject: "MFA not working - new phone",
      description: "Field rep got a new phone and can't approve sign-ins. Locked out of Outlook and Teams on laptop. At a customer site.",
    },
    caller: {
      username: "carlos.rivera",
      name: "Carlos Rivera",
      persona:
        "Charming but impatient field sales rep calling from a customer's lobby in Phoenix. He has a demo in 25 minutes and needs Teams and email. Moderate technical skill. Tries to bargain: 'can't you just turn that MFA thing off for a week?' Pushes once or twice, then accepts if the tech explains firmly and politely.",
      knows: [
        "You're Carlos Rivera, Field Sales Representative, remote in Phoenix. Employee ID 10726. Manager: Laura Bennett.",
        "Your laptop is BL-LT-0726. You're on the customer's guest Wi-Fi and the internet works.",
        "Yesterday you upgraded from a Samsung Galaxy S22 to a new iPhone 17. The store wiped and kept the old Samsung as a trade-in. Same phone number: 555-0126.",
        "You didn't set up the Authenticator app on the new phone. You didn't know you had to.",
        "Outlook and Teams signed you out this morning. When you sign in, it says 'Approve sign-in request. Open your Authenticator app and approve the request to sign in.' and nothing comes to your new phone.",
        "You still know your password. It works up to the MFA step.",
      ],
      opening: "Hey, Carlos Rivera, field sales. I got a new phone yesterday and now Outlook and Teams want me to approve something on my old phone, which I don't have anymore. I've got a demo in like twenty-five minutes. Can you help me out?",
    },
    secret:
      "His only MFA method is the Authenticator app on the old Samsung Galaxy S22, which was traded in and wiped. He needs an MFA reset (remove the old method / require re-registration) after STRONG verification per KB-012: a callback to the number on file (555-0126, which is still his number) or confirmation from his manager. After the reset, the next sign-in says 'More information required', and he sets up the Authenticator app on the new iPhone by scanning a QR code.",
    behavior: [
      "Early on (once or twice), ask the tech to 'just disable MFA on my account for a week, I'll set it up when I'm back'. Accept no if it's explained.",
      "If the tech says they'll call you back on your number on file, say 'sure, that's this number'. When the callback happens, you answer.",
      "Before the MFA reset: every sign-in asks to approve on the old phone and times out with 'We didn't hear from you'.",
      "After the MFA reset (or the old method removed): signing into Outlook shows 'More information required'. Once the technician has walked you through it (install Microsoft Authenticator from the App Store, 'Add account > Work or school account > Scan QR code', scan the code on the laptop, approve the test), do ALL of it in that same reply and report the result: it worked, Outlook is loading your mail. Teams then signs in fine too when you try it.",
      "If the tech doesn't guide you through re-registration, you can stumble through it with the on-screen prompts, but you ask 'what's this QR code thing?'",
    ],
    setup(env) {
      const u = findUser(env, "carlos.rivera");
      u.signIns = [
        { time: minutesAgo(4), app: "Microsoft Teams", location: "Phoenix, US", ip: "198.51.100.23", result: "Failure: MFA denied - user did not respond" },
        { time: minutesAgo(6), app: "Outlook", location: "Phoenix, US", ip: "198.51.100.23", result: "Failure: MFA denied - user did not respond" },
        { time: minutesAgo(1500), app: "Outlook", location: "Phoenix, US", ip: "198.51.100.7", result: "Success (MFA: push approved)" },
      ];
    },
    facts(env, attempt) {
      const u = findUser(env, "carlos.rivera");
      const old = u.mfa.find((m) => m.device === "Samsung Galaxy S22");
      if (old) return ["Your old Samsung is still your registered MFA method. Every sign-in waits for an approval on it and fails."];
      // Has the technician explained the Authenticator setup since the reset?
      const resetAt = attempt.timeline.findIndex((e) => e.target === "carlos.rivera" && (e.action === "reset_mfa" || e.action === "remove_mfa_method"));
      const guided = attempt.timeline.slice(resetAt).some((e) => e.type === "student" && /authenticator|qr|scan/i.test(e.text));
      if (!guided) return ["The technician has removed your old MFA method. The next sign-in says 'More information required' and wants you to set up MFA again. You don't know how yet."];
      return [
        "The technician has explained how to set up the Authenticator app. Do it all now, in this reply: install Microsoft Authenticator, Add account > Work or school > Scan QR code, scan the code on the laptop, approve the test. It WORKS: Outlook finishes signing in and loads your mail.",
        "MFA is now set up on your new iPhone, so Teams and everything else sign in normally when you try them.",
      ];
    },
    expert:
      "Acknowledge the urgency. Verify identity with STRONG verification for an MFA reset (KB-012): callback to the number on file 555-0126 (he still has the number) and/or employee ID + manager. Decline to disable MFA and explain why. Reset MFA (or remove the old Samsung method), then walk him through registering Authenticator on the new iPhone via the 'More information required' prompt and QR code. Confirm Outlook and Teams sign in. Remind him to move MFA before swapping phones next time. Document.",
    outcome: { type: "resolved" },
    rubric: [
      "MFA resets require stronger verification (KB-012): callback to the number on file or manager confirmation. Weak verification is a significant deduction.",
      "Disabling MFA or the account would be a policy violation.",
      "Should guide re-registration, not just reset and hang up.",
    ],
    checks(env, timeline) {
      const resetIdx = timeline.findIndex((e) => e.target === "carlos.rivera" && (e.action === "reset_mfa" || e.action === "remove_mfa_method"));
      const cbIdx = timeline.findIndex((e) => e.action === "callback" && (e.target === "carlos.rivera" || e.target === "laura.bennett"));
      return [
        { label: "Removed the old MFA method / reset MFA", passed: resetIdx !== -1 },
        { label: "Did a callback (user or manager) before the MFA reset", passed: resetIdx !== -1 && cbIdx !== -1 && cbIdx < resetIdx },
        { label: "Did not reset his password unnecessarily", passed: !did(timeline, "reset_password", "carlos.rivera") },
      ];
    },
    hints: [
      "Resetting someone's MFA lets a new phone take over their account. Read KB-012. What verification is required?",
      "His phone number didn't change. How could you use that for verification?",
      "After the reset, he still has to register the new phone. Can you walk him through it?",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "m4-slow-pc",
    difficulty: "medium",
    title: "My Computer Is SO Slow",
    category: "Performance",
    skills: ["Task Manager", "Disk space", "Not deleting user data without consent"],
    estMinutes: 15,
    ticket: {
      number: "INC0010275",
      channel: "Phone",
      priority: "P3 - Moderate",
      callerLabel: "Linda Okafor (Payroll)",
      contact: "Calling from desk phone x4177",
      subject: "Computer extremely slow",
      description: "Everything freezes. Takes 5 minutes to open Excel. Payroll runs tomorrow.",
    },
    caller: {
      username: "linda.okafor",
      name: "Linda Okafor",
      persona:
        "Stressed payroll specialist. Payroll runs tomorrow and her PC is crawling. Low technical skill but cooperative. Protective of her files: if the tech wants to delete something, she wants to know exactly what first.",
      knows: [
        "You're Linda Okafor, Payroll Specialist, Finance, 4th floor. Employee ID 10377. Manager: Tom Alvarez.",
        "Your PC is BL-DT-0377.",
        "It's been getting slower for about two weeks, and it's really bad today. Excel takes forever to open. Sometimes the whole screen freezes.",
        "A pop-up keeps saying something about 'low disk space' but you've been closing it.",
        "You download the payroll export spreadsheet from the payroll system every day and open it from Downloads.",
        "A while ago a compliance training video wouldn't play, so you clicked the download link several more times.",
      ],
      opening: "Hi, my computer is so slow I can barely use it. Excel takes like five minutes to open and everything freezes. Payroll runs tomorrow, so I really need this working today.",
    },
    secret:
      "Her C: drive is almost full: 1.2 GB free of 237 GB. Windows is starved for space (no room for the page file, temp, or updates), so the disk sits at 100%. Space hogs: Downloads = 61 GB (12 copies of 'Compliance_Training_2025.mp4' at ~4 GB each, plus ~300 daily 'Payroll_Export (n).xlsx' files with employee pay data), Recycle Bin = 18 GB, Temporary files = 9 GB. Freeing 20+ GB and restarting fixes the slowness. The payroll exports are sensitive and shouldn't pile up in Downloads; the official location is \\\\bl-fs01\\Payroll.",
    behavior: [
      "Task Manager (Ctrl+Shift+Esc) > Performance: CPU 35%, Memory 78%, Disk 0 (C:) 100%. Processes tab sorted by Disk: 'System' and 'Antimalware Service Executable' at the top, but nothing obviously crazy.",
      "File Explorer > This PC: 'Local Disk (C:) 1.2 GB free of 237 GB' with a red bar.",
      "Settings > System > Storage shows: Apps 41 GB, Other/Downloads 61 GB, Temporary files 9 GB (including Recycle Bin 18 GB when expanded), System 30 GB.",
      "If asked to open Downloads and sort by size: twelve copies of Compliance_Training_2025.mp4 (4 GB each) and hundreds of Payroll_Export spreadsheets.",
      "Before deleting anything, ask what it is. You're fine deleting the duplicate videos (the training is done) and emptying the Recycle Bin and temp files. You're nervous about the payroll exports: you want them moved to the Payroll share, not just deleted, unless the tech explains they're already in the payroll system.",
      "Once 20+ GB is free and you restart (or after a few minutes), the PC is noticeably faster and Excel opens in seconds.",
      "If the tech only suggests restarting or 'running a virus scan', the PC is still slow.",
    ],
    setup(env) {
      const d = findDevice(env, "BL-DT-0377");
      d.diskTotalGB = 237;
      d.diskFreeGB = 1.2;
      d.notes = "Health alert: C: below 1% free for 9 days";
    },
    facts() {
      return ["Track how much space has been freed from the conversation. The PC only gets fast after ~20 GB or more is freed AND the PC is restarted or given a few minutes."];
    },
    expert:
      "Ask how long it's been slow and what she sees (low disk space pop-up). Check the device record (1.2 GB free) and/or Task Manager (disk 100%) and This PC. Use Storage settings to find the biggest items. With her consent: delete the 11 duplicate training videos (keep one only if she wants it), empty Recycle Bin, clear temporary files (Storage Sense / Disk Cleanup). Move the payroll exports to \\\\bl-fs01\\Payroll or delete if they're duplicates of system data, and advise her that sensitive exports shouldn't live in Downloads. Restart and confirm speed. Suggest turning on Storage Sense. Document.",
    outcome: { type: "resolved" },
    rubric: [
      "Diagnosis should be based on evidence (disk usage), not guesswork like 'it needs more RAM' or 'reimage it'.",
      "Must get the user's consent before deleting her files.",
      "Bonus: addressing the sensitive payroll exports piling up in Downloads (data handling).",
      "Escalating for a hardware replacement or reimage is unnecessary.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [
        { label: "Looked at the device record (disk space)", passed: timeline.some((e) => e.action === "view_device" && e.target === "BL-DT-0377") },
        { label: "Made no unnecessary account changes", passed: changes.length === 0 },
      ];
    },
    hints: [
      "Slow everything + a pop-up she keeps closing. Check her device record in the Admin Center.",
      "Find out what is taking the space. Storage settings or sorting Downloads by size are good places to look. KB-015 has steps.",
      "Whose files are these? What should you do before deleting anything, and is any of it sensitive?",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "m5-bitlocker",
    difficulty: "medium",
    title: "Blue Screen Wants a Recovery Key",
    category: "Security & Encryption",
    skills: ["BitLocker recovery", "Matching key IDs", "Verification before disclosing secrets"],
    estMinutes: 12,
    ticket: {
      number: "INC0010279",
      channel: "Phone",
      priority: "P2 - High",
      callerLabel: "Frank Delgado (Fleet)",
      contact: "Calling from warehouse office phone 555-0300 (shared line)",
      subject: "Laptop asking for recovery key",
      description: "Laptop shows a blue BitLocker screen asking for a recovery key after an update last night.",
    },
    caller: {
      username: "frank.delgado",
      name: "Frank Delgado",
      persona:
        "Gruff, no-nonsense fleet manager in his late 50s. Low technical skill. Impatient ('I don't have time for this, the trucks are waiting'), but respects a tech who's clear and confident. Reads long numbers slowly and sometimes asks the tech to repeat.",
      knows: [
        "You're Frank Delgado, Fleet Manager at the Aurora Warehouse. Employee ID 10293. Manager: Marcus Lee.",
        "Your laptop is a Lenovo ThinkPad, asset tag BL-LT-0293.",
        "You're calling from the shared warehouse office phone because your laptop is stuck. Your own cell is 555-0193 and it's in your pocket.",
        "Last night before you left, a box popped up saying 'Lenovo firmware update - restart required' and you clicked Restart.",
        "The laptop screen is blue and says: 'BitLocker recovery. Enter the recovery key for this drive.' Further down: 'Use the number keys or function keys F1-F10 (use F10 for 0).' and a 'Recovery key ID' line (the exact ID is in the current situation below; only read it if asked for the key ID or what else is on the screen).",
      ],
      opening: "Yeah, Frank Delgado, fleet. My laptop's got some blue screen asking for a recovery key. I don't know any key. Can you just give it to me? I've got trucks waiting.",
    },
    secret:
      "A firmware (BIOS) update changed the TPM measurements, so BitLocker asks for the recovery key. Device BL-LT-0293 has TWO recovery keys stored: an OLD one from before the laptop was re-imaged (no longer valid) and the CURRENT one, whose Key ID starts with the characters shown on Frank's screen. The tech must verify Frank's identity per KB-008 BEFORE revealing a key (he's calling from a shared phone, so a callback to his cell 555-0193 or employee ID + manager), match the Key ID on screen, and read the 48-digit key in groups.",
    behavior: [
      "Only read the Recovery key ID if asked. Read it in pieces if it's long.",
      "When the tech reads the key, type it in and press Enter, then say what the screen does. If the digits match the CORRECT key (ignore dashes and spacing; small slips the tech corrects are fine): the laptop restarts and Windows boots normally to the login screen. If the digits match the OLD key or are wrong, the screen says 'That key isn't correct. Try again.'",
      "If the tech says they'll call your cell, say 'yeah fine, 555-0193, it's in my pocket'. You answer when the callback comes.",
      "Grumble about verification but go along with it if the tech explains it's to protect the data on your laptop.",
    ],
    setup(env, lab) {
      const d = findDevice(env, "BL-LT-0293");
      const current = d.bitlocker[0];
      d.bitlocker = [
        { keyId: "4C1E9A07-77B2-4F0D-9C51-2A8E6D3B1F44", recoveryKey: "512424-089397-660220-301158-713064-447612-205029-618871", created: daysAgo(520) },
        { ...current, created: daysAgo(190) },
      ];
      d.notes = "Re-imaged " + daysAgo(190) + " (INC0008122). Firmware update deployed last night via Lenovo Vantage.";
    },
    facts(env, attempt) {
      const d = findDevice(env, "BL-LT-0293");
      const current = d.bitlocker.find((k) => !k.keyId.startsWith("4C1E9A07"));
      const old = d.bitlocker.find((k) => k.keyId.startsWith("4C1E9A07"));
      const out = [`The Recovery key ID on your screen is: ${current.keyId.slice(0, 8)} (Windows shows just this first part; read the full line as 'Recovery key ID: ${current.keyId.slice(0, 8)}'). Only read it when asked.`];
      // Decide in code whether the technician has read a key, and which one,
      // instead of asking the AI to compare 48 digits. Digits from all
      // technician messages since the first key reveal are joined, so a key
      // read one group per message still counts.
      // Keys are 8 groups of 6 digits; only 6-digit runs count, so "group 1: ..." labels don't interfere.
      const groups = (text) => String(text).match(/(?<!\d)\d{6}(?!\d)/g) || [];
      const revealAt = attempt.timeline.findIndex((e) => e.action === "reveal_bitlocker");
      const spokenGroups = revealAt === -1 ? [] : attempt.timeline.slice(revealAt).filter((e) => e.type === "student").flatMap((e) => groups(e.text));
      const spoken = spokenGroups.join("");
      const digits = (k) => k.recoveryKey.replace(/\D/g, "");
      if (spoken.includes(digits(current))) {
        out.push("The technician has read you the CORRECT recovery key. Once you type it and press Enter, the laptop restarts and boots normally to the Windows login screen. Say so, and that you can sign in.");
      } else if (spoken.includes(digits(old))) {
        out.push("The technician read you a key that does NOT match this drive. After you type it and press Enter, the screen says 'That key isn't correct. Try again.' Say exactly that.");
      } else if (spokenGroups.length >= 8) {
        out.push("The digits the technician read don't form the correct key. After you press Enter, the screen says 'That key isn't correct. Try again.' Say exactly that.");
      } else if (spokenGroups.length > 0) {
        out.push(`The technician is partway through reading the key (${spokenGroups.length} of 8 groups so far). Type what they've read and ask for the next group.`);
      } else {
        out.push("You haven't been given a recovery key yet; the laptop is still on the BitLocker recovery screen.");
      }
      return out;
    },
    expert:
      "Explain briefly what the screen is (security feature after the firmware update). Verify identity per KB-008 BEFORE disclosing: he's on a shared phone, so call back his cell on file 555-0193, or verify employee ID 10293 + manager Marcus Lee. Ask for the Recovery key ID on screen. Find BL-LT-0293 in Devices, notice two keys, and reveal only the one whose ID matches the screen. Read the 48 digits in groups of six, confirming each group. Laptop boots. Advise him to call if it happens again; document key ID used and cause (firmware update).",
    outcome: { type: "resolved" },
    rubric: [
      "Disclosing a recovery key without verifying identity is a critical failure (KB-008).",
      "Must match the Key ID on screen. Revealing the wrong key or keys for other devices is a deduction (audited access).",
      "Reading 48 digits clearly in groups is a communication skill.",
    ],
    checks(env, timeline) {
      const d = findDevice(env, "BL-LT-0293");
      const current = d.bitlocker.find((k) => !k.keyId.startsWith("4C1E9A07"));
      const reveals = timeline.filter((e) => e.action === "reveal_bitlocker");
      return [
        { label: "Revealed the correct (current) key", passed: reveals.some((e) => e.text.includes(current.keyId)) },
        { label: "Did not reveal the old key or other devices' keys", passed: reveals.every((e) => e.text.includes(current.keyId)) },
      ];
    },
    hints: [
      "A recovery key unlocks all the data on that laptop. What does KB-008 say you need before reading one out?",
      "He's on a shared phone. Is there a number on file you could call to verify him?",
      "Look closely at the device: how many keys are stored? Which one matches what's on his screen?",
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "m6-excel-addin",
    difficulty: "medium",
    title: "Excel Crashes the Moment It Opens",
    category: "Applications",
    skills: ["Safe mode", "Isolating add-ins", "Spotting issues that affect many users"],
    estMinutes: 15,
    ticket: {
      number: "INC0010283",
      channel: "Chat",
      priority: "P2 - High",
      callerLabel: "Emily Tran (Finance)",
      contact: "Teams chat",
      subject: "Excel crashing on launch",
      description: "Excel closes immediately every time. Word and Outlook fine. Month-end close is today.",
    },
    caller: {
      username: "emily.tran",
      name: "Emily Tran",
      persona:
        "Sharp, dry-humored financial analyst typing in Teams chat. High technical skill for a non-IT person (knows Ctrl+Shift+Esc, can run commands), but has zero patience for 'have you tried turning it off and on again' without a reason. It's month-end close.",
      knows: [
        "You're Emily Tran, Financial Analyst, Finance, 4th floor. Employee ID 10512. Manager: Tom Alvarez.",
        "Your laptop is BL-LT-0512.",
        "Excel opens, shows the splash screen for a second, then closes. Sometimes a box says 'Microsoft Excel has stopped working'. It started this morning.",
        "You've already restarted twice.",
        "Word, Outlook, and Teams work fine.",
        "You use the AcmeReports add-in in Excel every day for month-end reports.",
        "You don't know about any updates, but there was a pop-up last night that said something was 'updated successfully'.",
      ],
      opening: "Excel crashes the second I open it. Splash screen, then gone. Already restarted twice, so please don't ask me to restart 😅 It's month-end close and I live in Excel today.",
    },
    secret:
      "Last night the Applications team pushed AcmeReports Add-in for Excel v4.2, and it crashes Excel on startup. Excel Safe Mode (excel /safe, or hold Ctrl while launching) opens fine because add-ins don't load. Disabling the 'AcmeReports Add-in for Excel' COM add-in fixes the crash. Event Viewer shows faulting module AcmeReportsXL.dll v4.2.0.0. Other AcmeReports users in Finance will hit this too, so the Applications Team needs to know (roll back or fix v4.2).",
    behavior: [
      "If asked to run 'excel /safe' (Win+R) or hold Ctrl while opening Excel and confirm Safe Mode: Excel opens with '[Safe Mode]' in the title bar, no crash.",
      "In Safe Mode, File > Options > Add-ins > Manage: COM Add-ins > Go lists 'AcmeReports Add-in for Excel' (checked), 'Microsoft Power Map for Excel' (unchecked), 'Microsoft Power Pivot for Excel' (checked).",
      "Unchecking AcmeReports, closing, and opening Excel normally: Excel works. Unchecking only Power Pivot doesn't help.",
      "If asked to check Event Viewer > Windows Logs > Application: 'Application Error, Event 1000: Faulting application name: EXCEL.EXE, Faulting module name: AcmeReportsXL.dll, version: 4.2.0.0'.",
      "Office Quick Repair or Online Repair (from Settings > Apps) takes a while and does NOT fix it. Reinstalling Office would take an hour and you'd be annoyed.",
      "Once Excel works, ask: 'OK but I still need AcmeReports for close. What now?' You're satisfied if the tech says they'll get the Applications team on it (or escalates) and, ideally, mentions you can export the data manually in the meantime or that they'll update you.",
      "Mention, if relevant, that your coworker Tom said his Excel was acting weird too.",
    ],
    setup() {},
    facts() {
      return ["No console action affects this. Whether Excel works depends only on the steps you've done in the conversation."];
    },
    expert:
      "Scope: only Excel, started this morning, after an 'update' pop-up. Try Safe Mode → works → it's an add-in. Disable the AcmeReports COM add-in → Excel works normally. Confirm with Event Viewer (AcmeReportsXL.dll 4.2). Recognize this likely affects every AcmeReports user (Tom mentioned issues): notify/escalate to the Applications Team with evidence (version, faulting module, workaround) so they can fix or roll back v4.2. Tell Emily the workaround, the impact on AcmeReports, and the next steps. Either 'Resolved' with a documented Applications Team follow-up, or 'Escalated: Applications Team' after restoring Excel, is acceptable.",
    outcome: { type: "resolved_or_escalated", team: "Applications Team" },
    rubric: [
      "Safe Mode is the key isolation step. Jumping straight to Office repair/reinstall wastes time.",
      "Recognizing a likely multi-user problem and routing it to the Applications Team is what makes this a strong answer.",
      "Respect her expertise: avoid scripted, patronizing steps.",
    ],
    checks(env, timeline) {
      const changes = timeline.filter((e) => e.type === "action" && e.action !== "callback");
      return [{ label: "Made no unnecessary account changes", passed: changes.length === 0 }];
    },
    hints: [
      "Only Excel crashes, and it started after something 'updated'. How can you start Excel without any extras loading?",
      "If Safe Mode works, what's the usual suspect? KB-014.",
      "Excel works again, but she uses that add-in for close, and she may not be the only one. Who needs to know?",
    ],
  },
];
