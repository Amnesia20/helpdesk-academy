# Put HelpDesk Academy online for free: Oracle Cloud + Groq

This guide puts HelpDesk Academy on a free cloud server so students can use it from anywhere, without your computer being on.

- **Server:** Oracle Cloud "Always Free" virtual machine. It stays on 24/7 and student data is saved on it.
- **AI:** Groq's free tier, which plays the callers, the Senior Tech, and the grader.
- **HTTPS:** a free web address from DuckDNS, plus Caddy, which gets the security certificate automatically.

**Cost:** $0. Oracle asks for a credit card to verify you're a real person, but Always Free resources aren't charged.
**Time:** about 45 minutes the first time.

> **Know the limits first.** Groq's free tier allows about 30 requests a minute and 8,000 tokens a minute *per model*, shared by everyone using your server. Each student message is one request. The app switches between three Groq models automatically, but expect it to handle **a few students at a time** and about **30 complete tickets a day** (in testing, the free models hit their rolling daily limit after roughly 30–35 tickets). When the limit is hit, students see "Wait N seconds and send again." For a full class, see [When you outgrow the free tier](#when-you-outgrow-the-free-tier).

---

## Step 1: Get a free Groq API key (5 minutes)

1. Go to **https://console.groq.com** and sign up (Google, GitHub, or email). No card needed.
2. Open **API Keys** → **Create API Key**. Name it `helpdesk-academy`.
3. **Copy the key** (it starts with `gsk_`). It's only shown once. Keep it somewhere safe for Step 6.

## Step 2: Create an Oracle Cloud account (10–15 minutes)

1. Go to **https://www.oracle.com/cloud/free/** and click **Start for free**.
2. Pick your **home region** carefully: the closest one to you. You can't change it later, and the free servers must live there.
3. Enter the card for verification. Oracle may place a small temporary hold. Always Free resources are never charged.
4. Wait for the "your account is ready" email, then sign in to the console.

**Recommended: upgrade to Pay As You Go.** Oracle shuts down free servers that sit **idle** (under 20% CPU for 7 days), and a class server is idle most of the week. Upgraded accounts aren't reclaimed, and anything within the Always Free limits still costs $0.
- In the console: **☰ menu → Billing & Cost Management → Upgrade and Manage Payment → Pay As You Go.**
- Then set a safety net: **Billing → Budgets → Create Budget** for $1 with an email alert. If anything ever starts costing money, you'll hear about it.

## Step 3: Create the server (10 minutes)

1. **☰ menu → Compute → Instances → Create instance.**
2. **Name:** `helpdesk-academy`.
3. **Image and shape → Edit:**
   - **Image:** Change image → **Canonical Ubuntu** → **24.04**.
   - **Shape:** Change shape → **Ampere** → **VM.Standard.A1.Flex**, **1 OCPU and 6 GB memory**. It should say *Always Free-eligible*.
   - If you get **"Out of capacity"**, try a different *Availability domain* on the same page, try again later, or pick **VM.Standard.E2.1.Micro** (also Always Free). The app runs fine on either.
4. **Networking:** keep the defaults (new virtual cloud network, public subnet). Make sure **Assign a public IPv4 address** is on.
5. **Add SSH keys:** choose **Generate a key pair for me** and click **Save private key**. You'll get a file like `ssh-key-2026-10-29.key` in Downloads. **Keep it safe.** It's the only way into your server.
6. Click **Create**. When the status turns **Running**, copy the **Public IP address** from the instance page. This guide calls it `YOUR.IP`.

## Step 4: Open the web ports in Oracle's network (5 minutes)

Oracle blocks web traffic until you allow it.

1. On your instance page, open the **subnet** link (under *Primary VNIC*), then the **Security** tab. Open **Default Security List for …**.
2. **Add Ingress Rules:**
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: **TCP**
   - Destination Port Range: `80,443`
3. Click **Add Ingress Rules**.

The server's own firewall also blocks these ports. The setup script in Step 6 opens them for you.

## Step 5: Get a free web address for HTTPS (5 minutes, recommended)

Without a web address, the site works at `http://YOUR.IP`, but students' PINs and your instructor password are sent **unencrypted**. A free DuckDNS address fixes that.

1. Go to **https://www.duckdns.org** and sign in.
2. Type a subdomain (for example `brightline-helpdesk`) and click **add domain**.
3. In the **current ip** box next to it, enter `YOUR.IP` and click **update ip**.

Your address is now `brightline-helpdesk.duckdns.org`. The setup script gets the HTTPS certificate for it automatically.

## Step 6: Install from your PC (10 minutes)

1. Open **PowerShell** and go to the project folder:

   ```powershell
   cd path\to\helpdesk-academy
   ```

2. Run the uploader with your IP and key file:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy\oracle\upload.ps1 -Ip YOUR.IP -Key "$HOME\Downloads\ssh-key-2026-10-29.key"
   ```

   (`-ExecutionPolicy Bypass` lets this one script run without changing your PC's settings.)

3. The first time, it asks:
   - Whether to trust the server. It answers this automatically for a new server.
   - Your **Groq API key**. The typing is hidden.
   - Your **DuckDNS address**, e.g. `brightline-helpdesk.duckdns.org`. Press Enter to skip.
   - A **class code** students must type to join. Press Enter for a random one.
   - An **instructor password**. Press Enter to generate a strong one.

4. It installs everything, which takes a few minutes. The last screen shows:

   ```
   Students go to:     https://brightline-helpdesk.duckdns.org
   Instructor view:    https://brightline-helpdesk.duckdns.org/instructor
   Class code:         HD-K3P9QX
   Instructor password: ...
   AI:                 LIVE
   ```

   **Write down the class code and instructor password.**

## Step 7: Try it

1. Open the student address on your phone or another computer. Sign in with the class code and open **Locked Out on Monday Morning**.
2. Chat with Michael and look him up in the Admin Center.
3. Open `/instructor` and sign in with the instructor password.
4. Share the address and class code with your students.

---

## Everyday tasks

**Connect to the server** (for the commands below):

```powershell
ssh -i "$HOME\Downloads\ssh-key-2026-10-29.key" ubuntu@YOUR.IP
```

| Task | How |
|---|---|
| Update the app after changing code | Run the Step 6 upload command again. Settings and student data are kept. |
| Change settings (Groq key, class code, password) | On the server: `sudo nano /opt/helpdesk-academy/.env`, save, then `sudo systemctl restart helpdesk-academy` |
| Change or add the DuckDNS address | Upload again with `-Reconfigure` added, or edit `DOMAIN` and `PUBLIC_URL` in `.env` and re-run `sudo bash /opt/helpdesk-academy/deploy/oracle/setup.sh` |
| Watch the live log | `sudo journalctl -u helpdesk-academy -f` (Ctrl+C to stop) |
| Restart the app | `sudo systemctl restart helpdesk-academy` |
| Install Ubuntu updates | `sudo apt update && sudo apt upgrade -y`, then `sudo reboot`. Everything starts again by itself. |

**Backups:** the server saves a copy of the database every day in `/opt/helpdesk-academy/data/backups/` and keeps 14 days. To download the current database to your PC, run these in PowerShell:

```powershell
ssh -i "$HOME\Downloads\ssh-key-2026-10-29.key" ubuntu@YOUR.IP "sudo install -o ubuntu -m 600 /opt/helpdesk-academy/data/db.json ~/db-backup.json"
scp -i "$HOME\Downloads\ssh-key-2026-10-29.key" ubuntu@YOUR.IP:db-backup.json .
```

---

## When you outgrow the free tier

When students often see "wait N seconds" messages, you have a few options (on the server, edit `.env` and restart):

- **Fewer messages per ticket:** `MAX_MESSAGES_PER_ATTEMPT=40` keeps each ticket shorter.
- **Groq's paid Developer plan** raises the limits a lot. Same key, no app changes.
- **Claude Haiku 5.5:** roughly 1–2 cents per completed ticket, and very reliable for a full class. Set:

  ```
  AI_PROVIDER=anthropic
  ANTHROPIC_API_KEY=sk-ant-...
  CALLER_MODEL=claude-haiku-5-5
  GRADER_MODEL=claude-haiku-5-5
  ```

---

## Troubleshooting

**"Out of capacity" when creating the server.** Free Ampere servers are popular. Try another availability domain, try again at a different time of day, or use the `VM.Standard.E2.1.Micro` shape.

**Upload says "Connection timed out".** Check the IP address and that the instance is *Running*. Port 22 (SSH) is open by default in Oracle's security list. If you removed it, add it back like in Step 4.

**"Permission denied (publickey)".** The key file doesn't match the server, or the user name is wrong. Ubuntu servers use `ubuntu`, which is the uploader's default.

**"UNPROTECTED PRIVATE KEY FILE".** The uploader fixes the key file's permissions automatically. If you use `ssh` by hand first, run this once:
`icacls "$HOME\Downloads\ssh-key-2026-10-29.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"`

**The site doesn't load.**
1. Check Step 4: ports 80 and 443 in the security list.
2. On the server: `sudo systemctl status helpdesk-academy caddy`. Both should be *active (running)*.
3. If you use DuckDNS, make sure it shows your current server IP.

**Browser warns about the certificate, or HTTPS doesn't work.** The DuckDNS address must point to `YOUR.IP` *before* setup runs, and ports 80 and 443 must be open. Fix that, then re-run `sudo bash /opt/helpdesk-academy/deploy/oracle/setup.sh`. Caddy's log: `sudo journalctl -u caddy -n 50`.

**The page shows "Demo mode".** The Groq key is missing or wrong. Edit `GROQ_API_KEY` in `.env` and restart. The log shows the reason: `sudo journalctl -u helpdesk-academy -n 30`.

**Students see "The free AI is at its per-minute limit".** That's the free tier doing its job. Waiting the number of seconds shown works. If it happens all the time, see [When you outgrow the free tier](#when-you-outgrow-the-free-tier).

**"The free AI has hit its daily limit".** Groq's daily token limit is reached. It frees up gradually over the following hours; the message says roughly how long to wait.

**The server stopped by itself.** Oracle may have reclaimed it for being idle. Start it again from the Instances page, and upgrade to Pay As You Go (Step 2) so it doesn't happen again.

---

## What the setup script does

`deploy/oracle/setup.sh` runs on the server. It's safe to re-run, and it never deletes your settings or student data. It:

1. Installs Node.js 24 from nodejs.org, checking the download against its published checksum.
2. Copies the app to `/opt/helpdesk-academy` and installs its packages.
3. Writes `/opt/helpdesk-academy/.env` from your answers the first time. It's readable only by root and the app.
4. Opens ports 80 and 443 in the server's own firewall. Oracle's Ubuntu images block them by default.
5. Installs **Caddy**, which serves the site, gets free HTTPS certificates, and forwards visitors to the app. The app itself only listens privately on the server.
6. Runs the app as a locked-down background service (`helpdesk-academy`) that starts on boot, restarts if it crashes, and can only write to its own data folder.
7. Adds a daily backup of the database.

## Privacy

Student conversations are stored on your server and sent to Groq to generate replies and grades. Check Groq's privacy policy and data settings in its console, and tell students to use made-up details only: no real passwords or personal information.
