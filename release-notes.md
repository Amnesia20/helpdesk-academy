HelpDesk Academy is a help desk training simulator. You work realistic IT support tickets, from easy to hard, with callers played by AI. Look up accounts in an admin console, follow company policy, and get graded by an AI team lead.

## What's new in 1.0.4

- **Now on Linux:** an **AppImage** for almost any 64-bit Linux, and a **.deb** for Ubuntu, Debian and Linux Mint. Same app, same version number as Windows.
- **Which copy is this?** Settings and **Help > About** now show the version and the kind of copy, for example "Version 1.0.4 · Windows", "Version 1.0.4 · Microsoft Store" or "Version 1.0.4 · Linux (AppImage)". Handy when asking for help.

Windows copies from 1.0.3 on update themselves; installing 1.0.4 over an older version keeps your settings and student progress. HelpDesk Academy is also on the [Microsoft Store](https://apps.microsoft.com/detail/9PL29XFJ4FH8), where it installs without a warning and updates itself.

## Download

Under **Assets** below:

| Your computer | File |
|---|---|
| Windows 10 or 11 (64-bit) | **HelpDesk-Academy-Setup-1.0.4.exe** (about 118 MB) |
| Linux, almost any (64-bit) | **HelpDesk-Academy-1.0.4-Linux.AppImage** |
| Ubuntu, Debian, Linux Mint (64-bit) | **HelpDesk-Academy-1.0.4-Linux.deb** |

## Install

**Windows**

1. Run the installer. Windows may say **"Windows protected your PC"** because the installer isn't code-signed yet. Click **More info**, then **Run anyway**.
2. Read and accept the license, then choose where to install. No admin rights needed. On the last page, choose whether to add a desktop shortcut.

**Linux**

- **AppImage:** allow it to run as a program (right-click, Properties, or `chmod +x HelpDesk-Academy-1.0.4-Linux.AppImage`), then open it. It updates itself. If it won't start, install `libfuse2` (`libfuse2t64` on Ubuntu 24.04 and newer).
- **.deb:** `sudo apt install ./HelpDesk-Academy-1.0.4-Linux.deb`, then open **HelpDesk Academy** from your apps menu. To update, install the newer .deb the same way.

**Then, on every computer:** the first time it starts, **Settings** opens. Choose an AI service:

- **Groq**: free. Get a key at https://console.groq.com (API Keys, then Create API Key).
- **Claude**: paid, best quality.
- **Ollama**: free and runs on your own computer (needs a strong graphics card).

Click **Test connection**, then **Save and restart**.

## What's inside

- 16 help desk labs: account lockouts, printers, Wi-Fi, DNS, MFA, BitLocker, phishing, social engineering, VIP emergencies and more
- AI callers with their own personalities, moods and screens you can't see
- A simulated admin console, a knowledge base, and a Senior Tech who gives hints
- AI grading on troubleshooting, resolution, security, communication and documentation, with a **Save as PDF** report to hand in
- An instructor dashboard, and optional sharing with students on your network

Private by default: only the person at the computer can use it until sharing is turned on in Settings.

## License

Free for noncommercial use under the PolyForm Noncommercial License 1.0.0: personal practice, schools, charities, government and research. Selling it or using it commercially requires written permission. Copyright (c) 2026 Levi M Wright.

## Verify your download

SHA-256 checksums:
```
e14018d4b6bafa0458fad3f62d7a12d70b050df4381ffe352d74176b70170de4  HelpDesk-Academy-Setup-1.0.4.exe
499d5e0e6d5a8d8f61e3fc6417380a6f0d89e85095020b768f37f2c1d9abc078  HelpDesk-Academy-1.0.4-Linux.AppImage
effa8ba11aea1e374fdffcae3e76ddfe9f3288d0e4670f7b398fa02498ad1c04  HelpDesk-Academy-1.0.4-Linux.deb
```
