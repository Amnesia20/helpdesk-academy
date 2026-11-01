# HelpDesk Academy

A help desk training simulator. Students sign in from their own computers, pick a ticket from a queue, and work it the way a real Tier 1/Tier 2 technician would. An AI plays each caller (with a personality, a mood, and a screen the student can't see), a simulated admin console lets them unlock accounts, reset passwords and MFA, manage groups, and more. When they close the ticket, an AI team lead grades them.

All tickets take place at **Brightline Logistics**, a fictional 800-person company. Every person, phone number, and address in it is made up.

## Download

Just want to use it? Install the app. You don't need anything else from this page.

| Your computer | Get it |
|---|---|
| **Windows 10 or 11** | **[Microsoft Store](https://apps.microsoft.com/detail/9PL29XFJ4FH8)** (recommended: installs without a warning and updates itself) |
| Windows 10 or 11 | The installer (`HelpDesk-Academy-Setup-….exe`) from the [latest release](https://github.com/Amnesia20/helpdesk-academy/releases/latest). It updates itself. Windows may say "Windows protected your PC" because it isn't code-signed: click **More info**, then **Run anyway**. |
| **Linux** | From the [latest release](https://github.com/Amnesia20/helpdesk-academy/releases/latest): the **AppImage** for almost any 64-bit Linux (updates itself), or the **.deb** for Ubuntu, Debian and Linux Mint. |
| Mac | Not available yet. You can [run it from the source code](#run-from-the-source-code-developers-and-self-hosting). |

Screenshots, install steps and a FAQ are on the **[website](https://amnesia20.github.io/helpdesk-academy/)**.

## Getting started

1. **Open the app.** The first time, **Settings** opens by itself.
2. **Choose an AI service** (it plays the callers and grades your work):
   - **Groq:** free. Sign up at <https://console.groq.com>, choose **API Keys**, then **Create API Key**, and paste it in.
   - **Claude:** paid, best quality. Needs prepaid credit at <https://console.anthropic.com>.
   - **Ollama:** free and runs on your own computer, but needs a strong graphics card.

   Click **Test connection**, then **Save and restart**.
3. **Sign in** with a username and a 4 to 8 digit PIN (your account is created the first time), then start with an Easy ticket.

No AI key yet? The app still opens in **demo mode**, so you can look around; callers give placeholder replies until an AI service is set up. You can open **Settings** any time with the button in the top bar (or Ctrl+,).

## Using it with a class

There are two ways.

**Students practice on their own (simplest).** Each student installs the app and uses their own free Groq key, at home or in class. When they finish a ticket, the results page shows their name, the date and their score, and **Save as PDF** saves the whole report, including the call, to hand in with an assignment.

**Run the class from your computer.** In **Settings**, tick **Let students on my network connect**. Students on the same Wi-Fi open the address shown there in any web browser (nothing to install) and type the class code. The first time, your computer asks about the firewall: allow it on private networks. Open **HelpDesk Academy > Instructor dashboard** (Ctrl+2) and sign in with the instructor password from Settings to see:

- Every student's rank, XP, labs completed, average score, and what they're working on right now.
- A per-lab table with average scores per category, so you can see which skills the class needs more practice on.
- Every attempt's full timeline: conversation, console actions, hints, notes, the grade, and an instructor-only panel explaining what was really going on.
- **Export CSV** of all graded attempts, and buttons to reset a student's PIN or delete a student.

In this mode every student uses your AI key. Groq's free tier only handles a few students at a time, so for a full class use Claude or Ollama.

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
6. **Hand it in** (optional): the results page shows the student's name and the date, and **Save as PDF** saves the whole report with the full call, ready to attach to an assignment.

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

## About the desktop app

- **Menu > HelpDesk Academy:** Student practice (Ctrl+1), Instructor dashboard (Ctrl+2), Settings (Ctrl+,), Let students connect, Open data folder. The **Settings** button in the top bar only appears in the app's own window, not to students joining from a browser.
- **Private by default:** only the person at that computer can use it, and no class code is asked for, until **Let students on my network connect** is turned on.
- **Which copy is this?** Settings and **Help > About** show the version and the kind of copy, for example "Version 1.0.4 · Windows", "· Microsoft Store" or "· Linux (AppImage)". Every platform uses the same version number.
- **Updates:** the Microsoft Store version updates through the Store. The Windows installer from GitHub (1.0.3 and later) and the Linux AppImage check GitHub shortly after they start and twice a day, download a new version in the background, and ask to restart (**Later** installs it when the app closes). **Help > Check for updates…** checks right away. The Linux .deb updates by installing the newer .deb.
- **Where your data lives** (settings, student progress and a log file):

  | Copy | Folder | When you uninstall |
  |---|---|---|
  | Windows installer from GitHub | `%APPDATA%\HelpDesk Academy` | Kept, so reinstalling doesn't lose progress |
  | Microsoft Store | Its own package folder (**Open data folder** in the menu) | Deleted |
  | Linux | `~/.config/HelpDesk Academy` | Kept |

  The first time the Store version starts on a PC that had the GitHub version, it copies over that version's settings and progress.
- **Desktop shortcut:** the Windows installer's last page has a **Create a desktop shortcut** checkbox, and **Settings > This computer** adds or removes it any time (Windows and Microsoft Store versions).

---

## Run from the source code (developers and self-hosting)

You only need this to change the app, to run it on a Mac, or to host it as a website that students open in a browser from anywhere (on a server or a computer that stays on). Everyone else can use the [downloads](#download) above.

1. Install **Node.js 22 or newer** from <https://nodejs.org>.
2. In this folder, copy `.env.example` to `.env` and add **one** AI key:
   - **Free:** a Groq key from <https://console.groq.com> after `GROQ_API_KEY=`. Fine for testing and small groups; it has per-minute limits.
   - **Paid, best quality:** an Anthropic key from <https://console.anthropic.com> after `ANTHROPIC_API_KEY=`.
3. Double-click **`start.bat`** (Windows), or run:

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

To run the desktop app (with its window and Settings screen) from the source code instead, use `npm run app`.

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

Students pick a username and a 4-8 digit PIN the first time they sign in; that creates their account. If someone forgets their PIN, reset it from the instructor dashboard at `/instructor`. Sign in there with the instructor password (set `INSTRUCTOR_PASSWORD` in `.env`, or use the generated one saved in `data/instructor-password.txt`).

### Configuration (`.env`)

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

### Data

Running from the source code, everything is stored in `data/db.json` (or the folder set in `DATA_DIR`): usernames, display names, hashed PINs, and every ticket's conversation and grade. To start a new term, stop the server and delete `data/db.json` (back it up first if you want the old results).

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

## Building the apps (developers)

### Windows installer

On Windows, from this folder:

```powershell
npm install
npm run dist
```

The installer appears at `dist\HelpDesk-Academy-Setup-<version>.exe` (about 120 MB, version from `package.json`), with its `.blockmap` and `latest.yml` for automatic updates. It installs just for the current Windows user (no admin rights), shows the license, and offers a desktop shortcut on its last page (`build/installer.nsh`). Running a newer installer over an existing install updates it and keeps its settings. Removing the "Windows protected your PC" warning requires buying a code-signing certificate.

Automatic updates live in `electron/updater.js` (electron-updater, reading `latest.yml` / `latest-linux.yml` from the latest GitHub release).

### Microsoft Store package (MSIX)

`npm run dist:store` builds `dist\HelpDesk-Academy-Store-<version>.msix` to upload in Partner Center. Microsoft signs it during certification, so Store users get no Windows warning.

- It needs the free [Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/) for `makeappx.exe` (electron-builder's own copy doesn't start on recent Windows). `scripts/dist-store.mjs` finds the newest installed SDK automatically.
- The `appx` section of `package.json` must hold the three values from Partner Center > Product management > Product identity: `identityName` (Package/Identity/Name), `publisher` (Package/Identity/Publisher) and `publisherDisplayName` (Package/Properties/PublisherDisplayName).
- The Store tile images are generated from `build/icon.svg` into `build/appx/` by `scripts/make-appx-assets.mjs`.
- The Store version keeps its settings and data in its package folder (`%LOCALAPPDATA%\Packages\<package>\LocalState\HelpDesk Academy`), which Windows deletes on uninstall.

### Linux (AppImage and .deb)

Linux packages have to be built on Linux, so `scripts/build-linux-wsl.sh` does it inside WSL (Ubuntu): `wsl -d Ubuntu -- bash scripts/build-linux-wsl.sh` from this folder. It downloads its own Node.js into `~/.local/node` (no admin rights), builds a copy of the project in `~/hda-build` (without `node_modules`, `dist`, `data` or `.env`), and copies `HelpDesk-Academy-<version>-Linux.AppImage`, `.deb` and `latest-linux.yml` into `dist\`. On a Linux PC, `npm run dist:linux` does the same directly.

To try the app inside WSL, Ubuntu needs `libnss3`, `libasound2t64` and `libfuse2t64`. AppImage users on other PCs may need `libfuse2` (`libfuse2t64` on Ubuntu 24.04 and newer); the .deb installs with `sudo apt install ./HelpDesk-Academy-<version>-Linux.deb`.

## Releasing a new version

Every version goes out in three places: GitHub Releases (the Windows and Linux downloads), the website, and the Microsoft Store. The commands use PowerShell in this folder and the [GitHub CLI](https://cli.github.com/) (`gh`).

1. **Bump the version.** Use the next number: `1.0.3` for fixes, `1.1.0` for new labs or features. The Store refuses a package whose version isn't higher than the last one.

   ```powershell
   npm version 1.0.3 --no-git-tag-version
   ```

2. **Try it.** `npm run app`, then work a ticket or two.

3. **Build all the packages.** This makes `dist\HelpDesk-Academy-Setup-1.0.3.exe` plus its `.blockmap` and `dist\latest.yml` (Windows, GitHub), `dist\HelpDesk-Academy-Store-1.0.3.msix` (Store), and `dist\HelpDesk-Academy-1.0.3-Linux.AppImage`, `.deb` and `dist\latest-linux.yml` (Linux, built inside WSL; see [Linux](#linux-appimage-and-deb)).

   ```powershell
   npm run dist
   npm run dist:store
   wsl -d Ubuntu -- bash scripts/build-linux-wsl.sh
   ```

4. **Write the release notes** in `release-notes.md`: update "What's new", the version numbers, and the SHA-256 checksums at the bottom. This prints them:

   ```powershell
   Get-FileHash dist\HelpDesk-Academy-Setup-1.0.3.exe, dist\HelpDesk-Academy-1.0.3-Linux.AppImage, dist\HelpDesk-Academy-1.0.3-Linux.deb | ForEach-Object { "$($_.Hash.ToLower())  $(Split-Path $_.Path -Leaf)" }
   ```

5. **Commit and push.** Check `git status` first so nothing unexpected goes in.

   ```powershell
   git status
   git add -A
   git commit -m "Version 1.0.3"
   git push
   ```

6. **Publish the GitHub release.** Upload all six files: `latest.yml` (Windows) and `latest-linux.yml` (AppImage) are how installed copies find the update (without them they never see it), and the `.blockmap` lets the next Windows update download only what changed. Don't delete old releases.

   ```powershell
   gh release create v1.0.3 dist\HelpDesk-Academy-Setup-1.0.3.exe dist\HelpDesk-Academy-Setup-1.0.3.exe.blockmap dist\latest.yml dist\HelpDesk-Academy-1.0.3-Linux.AppImage dist\HelpDesk-Academy-1.0.3-Linux.deb dist\latest-linux.yml --title "HelpDesk Academy 1.0.3" --notes-file release-notes.md
   ```

   Installed copies (1.0.3 and later) pick up the release within about 12 hours, or right away with **Help > Check for updates…**.

7. **Update the website.** `npm run site` writes the new version, download links, file size and checksum into `docs/index.html`. Do this after step 6 so the site never links to a release that doesn't exist yet. The site updates about a minute after the push.

   ```powershell
   npm run site
   git commit -am "Website: version 1.0.3"
   git push
   ```

8. **Submit to the Microsoft Store** (skip it when nothing changed for Windows users). In Partner Center, open HelpDesk Academy and choose **Start update**. Then:
   - **Packages:** upload the new `.msix` and remove the old one.
   - **Store listings > English:** replace the text in **What's new in this version** (delete the old version's text first, don't add to it), and update the screenshots if the screens changed. Each product feature goes in its own box. Keep `store/listing.md` in sync.
   - **Submission options > Notes for certification:** the testers need a working AI key, and the last one was deleted. Create a new Groq key called "Microsoft review" at [console.groq.com/keys](https://console.groq.com/keys) and paste it in place of the old key.
   - **Submit.** Review usually takes one to three days. Store users get the update automatically. Delete the "Microsoft review" key once it's approved.

## Data and privacy

The app keeps everything on the computer that runs it: usernames, display names, hashed PINs, and every ticket's conversation and grade (see [where your data lives](#about-the-desktop-app)). Conversations are sent only to the AI service you chose, to write the caller's replies and the grade. Tell students to use made-up details only: no real passwords or personal information. The Windows installer from GitHub and the Linux AppImage also check GitHub Releases for updates (nothing about the user is sent). The full [privacy notice](https://amnesia20.github.io/helpdesk-academy/privacy.html) is on the website (source in `docs/`).

## Project layout

```
server.js          Web server and API
src/ai.js          AI roles (caller, mentor, grader) and demo mode
src/openai-compat.js  Groq / OpenAI-compatible client with model rotation
src/prompts.js     The prompts for each AI role
src/console.js     Simulated admin console actions
src/db.js          JSON-file storage
labs/              Labs, company directory, knowledge base
public/            Student app (index.html, app.js) and instructor dashboard
electron/          Desktop app: main.js (window, menus, embedded server), Settings window, updater
build/, scripts/   App icon, installer page, build and release helpers (Store, Linux in WSL, website update)
deploy/oracle/     Free cloud hosting: setup.sh (server), upload.ps1 (your PC), guide
deploy/windows/    Auto-start at login: install-autostart.ps1, run-server.ps1, stop-server.ps1
docs/              The website (GitHub Pages): download page and privacy notice
store/             Microsoft Store listing text, screenshots and logos
release-notes.md   Notes for the latest GitHub release (edit for each new version)
```

## License

HelpDesk Academy is licensed under the **PolyForm Noncommercial License 1.0.0** (see [LICENSE.md](LICENSE.md)). Anyone may use, change, and share it for free for noncommercial purposes: personal practice, schools, charities, government, and research. Selling it, or using it for a commercial purpose, needs separate written permission from the copyright holder.

The open-source libraries it uses (Express, the Anthropic SDK, Electron and others) keep their own licenses. Their notices ship inside the app.
