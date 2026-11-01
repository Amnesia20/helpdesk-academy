# HelpDesk Academy

A help desk training simulator. Students sign in from their own computers, pick a ticket from a queue, and work it the way a real Tier 1/Tier 2 technician would. An AI plays each caller (with a personality, a mood, and a screen the student can't see), a simulated admin console lets them unlock accounts, reset passwords and MFA, manage groups, and more. When they close the ticket, an AI team lead grades them.

All tickets take place at **Brightline Logistics**, a fictional 800-person company. Every person, phone number, and address in it is made up.

**Get the Windows app:** [Microsoft Store](https://apps.microsoft.com/detail/9PL29XFJ4FH8) (no warning, updates itself) or the installer on the [website](https://amnesia20.github.io/helpdesk-academy/)

## What students do

1. **Pick a ticket** from the queue: 16 labs, Easy → Medium → Hard.
2. **Talk to the caller** in the chat. The AI caller only reveals clues when asked the right questions, reads back command output when told what to type, and reacts to the student's tone (the mood meter shows it).
3. **Use the tools**:
   - **Admin Center**: search users (two people share some names on purpose), unlock, reset password, revoke sessions, MFA, groups, inbox rules and forwarding, sign-in logs, devices, BitLocker keys, access requests, and "call the number on file" for identity verification.
   - **Knowledge Base**: 15 company policy and how-to articles (identity verification, least privilege, phishing response, VPN, etc.).
   - **Senior Tech**: an AI mentor gives nudges, not answers (3 per ticket, each costs a few points).
4. **Close the ticket** as Resolved or Escalated (to the right team) with resolution notes.
5. **Get graded** out of 100:

   | Category | Points | What it measures |
   |---|---|---|
   | Troubleshooting | 25 | Logical diagnosis, evidence before changes |
   | Resolution | 25 | Fixed the root cause or escalated correctly; confirmed with the caller |
   | Security & policy | 20 | Identity verification first, least privilege, protecting secrets |
   | Communication | 15 | Empathy, plain language, setting expectations |
   | Documentation | 15 | Notes the next tech could act on |

   A **critical failure** (for example resetting the CFO's password for an unverified caller) caps the score at 40. Each hint used subtracts 3 points (max 15).
6. **Hand it in** (optional): the results page shows the student's name and the date, and **Save as PDF** saves the whole report with the full call, ready to attach to an assignment. Students can practice at home with their own free AI key and send the PDF or a screenshot to their teacher.

XP = best score × difficulty (1×/2×/3×). Ranks go Trainee → Tier 1 Technician → Senior Tier 1 → Tier 2 Technician → Help Desk Lead.

## The labs

| Level | Lab | What it teaches |
|---|---|---|
| Easy | Locked Out on Monday Morning | Picking the right account, verification, finding *why* it locked |
| Easy | Where Did My Email Go? | Scoping questions, Outlook "Work Offline" |
| Easy | The Wi-Fi Disappeared | Calm, simple guidance; airplane mode |
| Easy | Printing to Nowhere | Default printers in Windows 11, stuck queues |
| Easy | Second Monitor Went Black | Ruling out cables, Win+P projection modes |
| Medium | New Hire Can't Open the Finance Share | Approved requests only, least privilege, sign-out to refresh groups |
| Medium | Some Websites Work, Some Don't | ipconfig / nslookup, a manually set public DNS |
| Medium | New Phone, No Way to Sign In | Stronger verification for MFA resets; refusing to disable MFA |
| Medium | My Computer Is SO Slow | Evidence-based diagnosis (full disk), consent before deleting files |
| Medium | Blue Screen Wants a Recovery Key | BitLocker: verify first, match the Key ID (two keys stored) |
| Medium | Excel Crashes the Moment It Opens | Safe mode, bad add-in, recognizing a multi-user issue |
| Hard | Expired Password, Working From Home | VPN + cached credentials, the "must change at next logon" trap |
| Hard | Coworkers Got Weird Emails From Me | Compromised account: full containment + escalate to SOC |
| Hard | Urgent Call From the CFO | Social engineering under pressure: verify, refuse, report |
| Hard | No Network at the New Desk | Physical-layer isolation and an escalation another team can act on |
| Hard | Boardroom in 10 Minutes | VIP pressure, three problems in a row, when policy *doesn't* apply |

## Setup (Windows)

1. Install **Node.js 22 or newer** from <https://nodejs.org>.
2. In this folder, copy `.env.example` to `.env` and add **one** AI key:
   - **Free:** a Groq key from <https://console.groq.com> after `GROQ_API_KEY=`. Fine for testing and small groups; it has per-minute limits.
   - **Paid, best quality:** an Anthropic key from <https://console.anthropic.com> after `ANTHROPIC_API_KEY=`.
3. Double-click **`start.bat`**, or run:

   ```bash
   npm install
   npm start
   ```

The server window prints everything you need:

```
  On this computer:   http://localhost:3300
  Students connect:   http://192.168.1.50:3300
  Instructor view:    http://localhost:3300/instructor
  Instructor password: saved in ...\data\instructor-password.txt
  AI:                 LIVE via Groq (caller: openai/gpt-oss-120b → openai/gpt-oss-20b; ...)
```

Without an AI key it still starts, in **demo mode**: you can click through everything, but callers give placeholder replies and grades are rough estimates from the objective checks.

### Desktop app (Windows installer)

HelpDesk Academy also comes as a normal Windows program: an installer, a Start-menu shortcut (and a desktop one if you tick the box on the installer's last page or in Settings), its own window, and a **Settings** screen for the AI key, class code, and instructor password. The person installing it doesn't need Node.js or any files to edit.

**Build the installer** (on Windows, from this folder):

```powershell
npm install
npm run dist
```

The installer appears at `dist\HelpDesk-Academy-Setup-<version>.exe` (about 120 MB, version from `package.json`). Give that one file to anyone who should have the app. Running a newer installer over an existing install updates it and keeps its settings.

**Updates:** from version 1.0.3 the installed app updates itself (`electron/updater.js`, using electron-updater). Shortly after it starts, and twice a day while open, it checks the latest GitHub release for `latest.yml`, downloads a newer installer in the background, and asks to restart (**Later** installs it when the app closes). **Help > Check for updates…** checks right away. The Microsoft Store version and `npm run app` don't use this.

**Installing:** run the installer and pick a folder. It installs just for that Windows user, so it doesn't need admin rights. The installer isn't code-signed, so Windows may show **"Windows protected your PC"**: click **More info**, then **Run anyway**. (Removing that warning requires buying a code-signing certificate.)

**First launch:** Settings opens automatically. Pick an AI service (free Groq key, paid Claude key, or Ollama on the same computer), click **Test connection**, then **Save and restart**.

**In the app:**
- **Settings** button in the top bar (and on the sign-in page), shown only in the app's own window, not to students joining from a browser.
- **Menu > HelpDesk Academy:** Student practice (Ctrl+1), Instructor dashboard (Ctrl+2), Settings (Ctrl+,), Let students connect, Open data folder.
- By default only the person at that computer can use it, and no class code is asked for. Turn on **Let students on my network connect** in Settings to let other computers on the same Wi-Fi join in a browser. They'll need the class code. Windows asks once about the firewall: choose Allow.
- Settings, student progress and a log file live in `%APPDATA%\HelpDesk Academy`. Uninstalling (Windows Settings > Apps) keeps them, so reinstalling doesn't lose progress.

**Try it without building:** `npm run app` starts the desktop app straight from the source code.

### Microsoft Store package (MSIX)

`npm run dist:store` builds `dist\HelpDesk-Academy-Store-<version>.msix` to upload in Partner Center. Microsoft signs it during certification, so Store users get no Windows warning.

- It needs the free [Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/) for `makeappx.exe` (electron-builder's own copy doesn't start on recent Windows). `scripts/dist-store.mjs` finds the newest installed SDK automatically.
- The `appx` section of `package.json` must hold the three values from Partner Center > Product management > Product identity: `identityName` (Package/Identity/Name), `publisher` (Package/Identity/Publisher) and `publisherDisplayName` (Package/Properties/PublisherDisplayName).
- The Store tile images are generated from `build/icon.svg` into `build/appx/` by `scripts/make-appx-assets.mjs`.
- The Store version keeps its settings and data in its package folder (`%LOCALAPPDATA%\Packages\<package>\LocalState\HelpDesk Academy`), which Windows deletes on uninstall. On first start it copies settings and progress from `%APPDATA%\HelpDesk Academy` if the GitHub version was used on that PC.

### Put it online from your PC (Tailscale Funnel)

[Tailscale Funnel](https://tailscale.com/kb/1223/funnel) gives the app a free, permanent HTTPS address (like `https://your-pc.your-tailnet.ts.net`) without touching your router. Your PC must be on with the app running.

1. Install Tailscale from <https://tailscale.com/download> and sign in.
2. In PowerShell: `tailscale funnel --bg 3300`. The first time, it gives you a link to approve Funnel on your account.
   Then run `tailscale set --unattended=true`. Without it, Windows Tailscale disconnects when its tray app isn't running, and the link goes down.
3. In `.env`, set `PUBLIC_URL=` to the address it prints, set a `CLASS_CODE`, and set `TRUST_PROXY=1`. Then restart the app.

Funnel keeps running across reboots. To turn it off: `tailscale funnel --https=443 off`.

### Start automatically with Windows

To keep the app running without a window, and restart it if it ever crashes:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-autostart.ps1
```

This adds a "HelpDesk Academy" task that runs at login. Output goes to `data\server.log`.

- **Stop it:** `powershell -ExecutionPolicy Bypass -File .\deploy\windows\stop-server.ps1`
- **Start it again without logging out:** `Start-ScheduledTask -TaskName "HelpDesk Academy"`
- **Restart after changing `.env`:** run the stop command, then the start command.
- **Turn auto-start off:** run `install-autostart.ps1` with `-Remove`.

Windows must stay awake for people to reach the app: set Sleep to **Never** while plugged in (Settings > System > Power).

### Put it online for free (no PC needed)

To let students use it from anywhere without your computer running, follow **[deploy/oracle/README.md](deploy/oracle/README.md)**. It covers a free Oracle Cloud server, the free Groq AI, and free HTTPS. One PowerShell command uploads and installs everything.

### Letting students connect

Students open the "Students connect" address in any browser on the same network. The first time you start it, Windows may ask whether to allow Node.js through the firewall: allow it on **private networks**. If students still can't reach it, open PowerShell **as administrator** on the server computer and allow the port:

```powershell
New-NetFirewallRule -DisplayName "HelpDesk Academy" -Direction Inbound -Protocol TCP -LocalPort 3300 -Action Allow -Profile Private
```

Set `CLASS_CODE` in `.env` if you want only your class to be able to join.

### Accounts

Students pick a username and a 4-8 digit PIN the first time they sign in; that creates their account. If someone forgets their PIN, reset it from the instructor dashboard.

## Instructor dashboard

Go to `/instructor` and sign in with the instructor password (set `INSTRUCTOR_PASSWORD` in `.env`, or use the generated one saved in `data/instructor-password.txt`). You get:

- Every student's rank, XP, labs completed, average score, and what they're working on right now.
- A per-lab table with average scores per category, so you can see which skills the class needs more practice on.
- Every attempt's full timeline: conversation, console actions, hints, notes, the grade, and an instructor-only panel explaining what was really going on.
- **Export CSV** of all graded attempts.
- Reset a student's PIN, or delete a student.

## Configuration (`.env`)

| Setting | Default | Notes |
|---|---|---|
| `GROQ_API_KEY` | (none) | Free AI via Groq |
| `ANTHROPIC_API_KEY` | (none) | Claude (used if both keys are set) |
| `AI_PROVIDER` | auto | `anthropic`, `groq`, or `openai` (any OpenAI-compatible server, e.g. Ollama) |
| `AI_BASE_URL` / `AI_API_KEY` | (none) | For `AI_PROVIDER=openai`, e.g. `http://localhost:11434/v1` |
| `INSTRUCTOR_PASSWORD` | generated | Saved in `data/instructor-password.txt` |
| `CLASS_CODE` | (none) | Students must enter it to join |
| `PORT` / `HOST` | 3300 / all interfaces | |
| `CALLER_MODEL` / `CALLER_EFFORT` | Claude: `claude-opus-5-5`; Groq: `openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b` / `low` | Plays callers and the Senior Tech. A comma list = backups used when one is rate limited |
| `GRADER_MODEL` / `GRADER_EFFORT` | Claude: `claude-opus-5-5`; Groq: gpt-oss-120b, gpt-oss-20b, qwen3.8-27b / `medium` | Grades closed tickets |
| `AI_CONCURRENCY` | 2 for Groq/OpenAI-compatible | How many AI requests run at once |
| `MAX_MESSAGES_PER_ATTEMPT` | 60 | Limits cost (or free quota) per ticket |
| `MAX_HINTS_PER_ATTEMPT` | 3 | |
| `HINT_PENALTY` | 3 | Points per hint |
| `PUBLIC_URL` | (none) | The address shown at startup when hosted online |
| `TRUST_PROXY` | off | Set to 1 behind a reverse proxy (Caddy, nginx) |
| `DATA_DIR` | `./data` | Where the database is stored |

**Cost with Claude:** rough estimate with the default models: about $0.30-$0.60 per completed ticket (a 20-message conversation plus grading). Setting `CALLER_MODEL=claude-haiku-5-5` and `GRADER_MODEL=claude-haiku-5-5` brings it to roughly 1–2 cents per ticket, with somewhat less nuanced role-play. Check current prices at <https://www.anthropic.com/pricing>.

The Claude Opus 5.5 requests use Anthropic's server-side refusal fallback (`fallbacks: "default"`), so if a safety check declines a request (more likely in the security labs), it's retried on a fallback model instead of failing.

**Groq's free tier** allows about 30 requests and 8,000 tokens per minute *per model*. The app rotates through the listed models (by default all three free Groq chat models) when one is rate limited, uses Groq's automatic prompt caching (cached tokens don't count against the limit), and tells students how long to wait when everything is busy. Expect it to handle a few students at a time.

## Data and privacy

Everything is stored in `data/db.json` on the server computer: usernames, display names, hashed PINs, and every ticket's conversation and grade. Conversations are sent to the AI service you configured (Anthropic or Groq) to generate replies and grades. Tell students to use made-up details only: no real passwords or personal information. The desktop app from GitHub also checks GitHub Releases for updates (nothing about the user is sent). The full [privacy notice](https://amnesia20.github.io/helpdesk-academy/privacy.html) is on the website (source in `docs/`).

To start a new term, stop the server and delete `data/db.json` (back it up first if you want the old results).

## Writing your own labs

Labs live in `labs/easy.js`, `labs/medium.js`, and `labs/hard.js`. Copy an existing lab and change it. The main fields:

- `ticket`: what the student sees in the queue and ticket panel.
- `caller`: which directory user is calling, their `persona`, what they `knows`, and their `opening` line.
- `secret`: what's really going on (hidden from students; the caller AI uses it for consistency).
- `behavior`: how things respond when the student tries something ("if asked to run ipconfig /all, read…").
- `setup(env)`: change the directory for this lab (lock an account, add an inbox rule, add a request…).
- `facts(env, attempt)`: what's true right now, recomputed every turn, so console actions have consequences.
- `expert`, `rubric`, `outcome`: what the grader compares against.
- `checks(env, timeline)`: objective pass/fail facts (e.g. "did NOT reset Diane's password").
- `hints`: the Senior Tech's suggested hint ladder.

The fictional company directory (people, groups, devices) is in `labs/directory.js`, and the knowledge base is in `labs/kb.js`. Restart the server after editing.

## Releasing a new version

Every version goes out in three places: GitHub Releases (the installer), the website, and the Microsoft Store. The commands use PowerShell in this folder and the [GitHub CLI](https://cli.github.com/) (`gh`).

1. **Bump the version.** Use the next number: `1.0.3` for fixes, `1.1.0` for new labs or features. The Store refuses a package whose version isn't higher than the last one.

   ```powershell
   npm version 1.0.3 --no-git-tag-version
   ```

2. **Try it.** `npm run app`, then work a ticket or two.

3. **Build both packages.** This makes `dist\HelpDesk-Academy-Setup-1.0.3.exe` plus its `.blockmap` and `dist\latest.yml` (GitHub), and `dist\HelpDesk-Academy-Store-1.0.3.msix` (Store).

   ```powershell
   npm run dist
   npm run dist:store
   ```

4. **Write the release notes** in `release-notes.md`: update "What's new", the version numbers, and the SHA-256 checksum at the bottom. This prints the checksum:

   ```powershell
   (Get-FileHash dist\HelpDesk-Academy-Setup-1.0.3.exe).Hash.ToLower()
   ```

5. **Commit and push.** Check `git status` first so nothing unexpected goes in.

   ```powershell
   git status
   git add -A
   git commit -m "Version 1.0.3"
   git push
   ```

6. **Publish the GitHub release.** Upload all three files: `latest.yml` is how installed copies find the update (without it they never see it), and the `.blockmap` lets the next update download only what changed. Don't delete old releases.

   ```powershell
   gh release create v1.0.3 dist\HelpDesk-Academy-Setup-1.0.3.exe dist\HelpDesk-Academy-Setup-1.0.3.exe.blockmap dist\latest.yml --title "HelpDesk Academy 1.0.3" --notes-file release-notes.md
   ```

   Installed copies (1.0.3 and later) pick up the release within about 12 hours, or right away with **Help > Check for updates…**.

7. **Update the website.** `npm run site` writes the new version, download links, file size and checksum into `docs/index.html`. Do this after step 6 so the site never links to a release that doesn't exist yet. The site updates about a minute after the push.

   ```powershell
   npm run site
   git commit -am "Website: version 1.0.3"
   git push
   ```

8. **Submit to the Microsoft Store.** In Partner Center, open HelpDesk Academy and choose **Start update**. Then:
   - **Packages:** upload the new `.msix` and remove the old one.
   - **Store listings > English:** update **What's new in this version** (and the screenshots if the screens changed). Keep `store/listing.md` in sync.
   - **Submission options > Notes for certification:** the testers need a working AI key, and the last one was deleted. Create a new Groq key called "Microsoft review" at [console.groq.com/keys](https://console.groq.com/keys) and paste it in place of the old key.
   - **Submit.** Review usually takes one to three days. Store users get the update automatically. Delete the "Microsoft review" key once it's approved.

## Project layout

```
server.js          Web server and API
src/ai.js          AI roles (caller, mentor, grader) and demo mode
src/openai-compat.js  Groq / OpenAI-compatible client with model rotation
deploy/oracle/     Free cloud hosting: setup.sh (server), upload.ps1 (your PC), guide
deploy/windows/    Auto-start at login: install-autostart.ps1, run-server.ps1, stop-server.ps1
electron/          Desktop app: main.js (window, menus, embedded server), Settings window
build/, scripts/   App icon (icon.svg -> icon.png via scripts/make-icon.mjs), build and release helpers
store/             Microsoft Store listing text, screenshots and logos
release-notes.md   Notes for the latest GitHub release (edit for each new version)
src/prompts.js     The prompts for each AI role
src/console.js     Simulated admin console actions
src/db.js          JSON-file storage
labs/              Labs, company directory, knowledge base
public/            Student app (index.html, app.js) and instructor dashboard
docs/              The website (GitHub Pages): download page and privacy notice
```

## License

HelpDesk Academy is licensed under the **PolyForm Noncommercial License 1.0.0** (see [LICENSE.md](LICENSE.md)). Anyone may use, change, and share it for free for noncommercial purposes: personal practice, schools, charities, government, and research. Selling it, or using it for a commercial purpose, needs separate written permission from the copyright holder.

The open-source libraries it uses (Express, the Anthropic SDK, Electron and others) keep their own licenses. Their notices ship inside the app.
