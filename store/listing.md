# Microsoft Store listing (English, en-US)

Paste these into Partner Center > HelpDesk Academy > Submission > **Store listings** > English.
Character limits are Partner Center's. Images: `store/screenshots/` and `store/logos/`
(regenerate the logos with `node scripts/make-store-art.mjs`).

Store policy 11.16 requires disclosing live generative AI in the listing: keep the
"Uses generative AI" section in the description.

---

## Product name

HelpDesk Academy (pick it from the dropdown)

## Description (max 10,000 characters)

```
Practice real help desk work before your first IT job.

HelpDesk Academy is a help desk training simulator. Every ticket is a live call: an AI plays the caller, with a personality, a mood, and a screen you can't see. Ask the right questions, use a simulated admin console, follow company policy, and close the ticket. Then an AI team lead grades your work out of 100 and tells you what to do better.

16 TICKETS, EASY TO HARD
Start with lockouts, missing email, Wi-Fi, printers, and a black second monitor. Move on to permissions, DNS, MFA resets, a slow PC, BitLocker recovery, and a crashing Excel add-in. Finish with an expired VPN password, a phished account, a scam call from a fake CFO, a dead network jack, and a boardroom emergency.

TOOLS LIKE THE REAL JOB
• Admin Center: search users, unlock accounts, reset passwords, revoke sessions, manage MFA, groups, inbox rules and forwarding, check sign-in logs, devices and BitLocker keys, and call the number on file to verify identity.
• Knowledge Base: 15 company policy and how-to articles.
• Senior Tech: an AI mentor who gives nudges, not answers. Each hint costs a few points.

GRADED THE WAY A TEAM LEAD WOULD
Every ticket is scored on troubleshooting, resolution, security and policy, communication, and documentation. Reset a password for a caller you never verified and your score is capped at 40, no matter how friendly you were.

FOR INSTRUCTORS
Run it for a class: turn on network sharing, and students on the same Wi-Fi join from a web browser with your class code. The instructor dashboard shows every student's rank and scores, class averages by skill, and the full timeline of every attempt. Export grades to CSV.

USES GENERATIVE AI
The callers, the Senior Tech's hints, and the grades are written live by an AI model in response to what you type. You choose the AI service in Settings:
• Groq: free, needs a free API key
• Claude (Anthropic): paid, best quality
• Ollama: runs on your own PC
Without a key, the app opens in demo mode with placeholder replies. AI can make mistakes, so treat grades as practice feedback.

PRIVACY
No account with us, no ads, no tracking. Your progress stays on your PC. Ticket conversations are sent only to the AI service you choose. Every company, person and phone number in the app is fictional, so use made-up details and never type a real password.

Free for personal practice, schools, nonprofits and research. Not for resale.
```

## What's new in this version (max 1,500)

Delete the previous version's text in Partner Center first, then paste this. It replaces the old text; it isn't added to it.

```
• Hand in your work: results now show your name and the date, and Save as PDF saves the full report, including the call, for an assignment.
• Settings is now a button in the top bar of every screen.
• Save and restart now applies a new AI key, instructor password or class code right away.
• Settings explains why the AI is off, for example when a key is rejected.
• The instructor password stays hidden until you click Show.
• The class code only appears when sharing with your network is turned on.
• New: add or remove a desktop shortcut in Settings > This computer.
```

(1.0.2, the first Store release, said: "First Microsoft Store release" plus its fixes.)

## Product features (up to 20, max 200 characters each)

Put each line in its own box (14 boxes). Partner Center removes line breaks, so pasting two lines into one box joins them into one run-on feature.

```
16 realistic help desk tickets, from easy to hard
AI callers with personalities, moods, and screens you can't see
Simulated Admin Center: unlock accounts, reset passwords and MFA, manage groups, inbox rules and BitLocker keys
Identity verification practice, including callbacks to the number on file
Social engineering and phishing scenarios
Knowledge base with 15 policy and how-to articles
AI Senior Tech mentor that gives nudges, not answers
Graded out of 100 in five skill areas, with specific feedback
XP and ranks from Trainee to Help Desk Lead
Instructor dashboard with class averages, full transcripts and CSV export
Classroom mode: students join from a web browser on the same network
Choice of AI: free Groq key, paid Claude key, or Ollama on your own PC
No account, ads or tracking; your progress stays on your PC
Demo mode works without an AI key
```

## Screenshots (Desktop, upload in this order) and captions (max 200)

| File | Caption |
|---|---|
| `01-security-call.png` | Every ticket is a live call. A caller claiming to be the CFO wants her password reset now. Verify first: the callback reaches the real CFO. |
| `02-senior-tech.png` | Stuck? Ask Sam, the AI Senior Tech, for a nudge. Each hint costs a few points. |
| `03-queue.png` | 16 tickets in three tiers. Earn XP and climb from Trainee to Help Desk Lead. |
| `04-knowledge-base.png` | Look up company policy in the built-in Knowledge Base while you work the call. |
| `05-grade.png` | Close the ticket and get graded out of 100 in five areas, with what went well and what to improve. |
| `06-instructor.png` | Instructors see every student's progress, class averages by skill, and full transcripts. |

## Store logos

| File | Partner Center slot |
|---|---|
| `store/logos/app-tile-300.png` | 1:1 App tile icon (300 x 300) |
| `store/logos/box-art-1080.png` | 1:1 Box art (1080 x 1080) |
| `store/logos/poster-720x1080.png` | 2:3 Poster art (720 x 1080) |

## Supplemental fields

**Short title** (max 50)

```
HelpDesk Academy
```

**Short description** (shown near the top of the listing)

```
Work realistic help desk tickets with AI callers, a simulated admin console, and instant grading. Free practice for students, schools, and anyone heading into IT support.
```

**Search terms** (up to 7, max 30 characters each, 21 words in total)

```
help desk training
IT support simulator
tech support practice
service desk
IT ticket training
social engineering
cybersecurity training
```

**Additional system requirements**

Minimum (max 200):

```
Internet connection and an AI key: a free Groq API key (console.groq.com) or a paid Claude API key.
```

Recommended (max 200):

```
To run the AI offline on your own PC with Ollama: a graphics card with 16 GB of memory.
```

## Additional information

**Copyright and trademark info** (max 200)

```
Copyright (c) 2026 Levi M Wright. All companies, people and phone numbers in the app are fictional.
```

**Additional license terms** (max 10,000)

```
HelpDesk Academy is licensed under the PolyForm Noncommercial License 1.0.0. You may use, change and share it for free for noncommercial purposes, such as personal practice, schools, charities, government and research. Selling it, or using it for a commercial purpose, requires written permission from the copyright holder. Full license: https://github.com/Amnesia20/helpdesk-academy/blob/main/LICENSE.md
```

**Developed by** (max 255)

```
Levi M Wright
```

## Pricing and availability (separate page)

- Pricing: **Free**
- Markets: all markets is fine
- Discoverability: "Make this product available and discoverable in the Microsoft Store"
