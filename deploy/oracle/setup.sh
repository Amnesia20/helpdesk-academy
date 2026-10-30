#!/usr/bin/env bash
# HelpDesk Academy: install or update on an Ubuntu server (built for Oracle
# Cloud Always Free, works on any Ubuntu 22.04/24.04 machine).
#
# Normally started for you by deploy/oracle/upload.ps1. To run it by hand from
# the uploaded copy of the project:
#   sudo bash deploy/oracle/setup.sh                    # install or update
#   sudo bash deploy/oracle/setup.sh --reconfigure      # answer the setup questions again
#   sudo bash deploy/oracle/setup.sh --ip 203.0.113.10  # tell it the public IP address
#
# Safe to re-run: it keeps your .env settings and student data.
set -euo pipefail

APP_DIR=/opt/helpdesk-academy
APP_USER=helpdesk
NODE_MAJOR=24
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$APP_DIR/.env"
RECONFIGURE=0
PUBLIC_IP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --reconfigure) RECONFIGURE=1 ;;
    --ip) PUBLIC_IP="${2:-}"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run this with sudo: sudo bash $0"
[ -f "$SRC_DIR/server.js" ] || die "Can't find server.js in $SRC_DIR."
if [ -r /etc/os-release ]; then
  . /etc/os-release
  [ "${ID:-}" = "ubuntu" ] || warn "This script is written for Ubuntu; this server runs ${PRETTY_NAME:-something else}."
fi

export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
HAS_TTY=0
if [ -r /dev/tty ] && [ -w /dev/tty ] && { : </dev/tty; } 2>/dev/null; then HAS_TTY=1; fi

# ------------------------------------------------------------------ packages --
say "Installing system packages"
apt-get update -y -qq
apt-get install -y -qq curl ca-certificates gnupg rsync xz-utils debian-keyring debian-archive-keyring apt-transport-https >/dev/null

# ------------------------------------------------------------------- node.js --
install_node() {
  if command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ]; then
    say "Node.js $(node -v) is already installed"
    return
  fi
  local arch
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) die "Unsupported CPU type $(uname -m)" ;;
  esac
  say "Installing Node.js $NODE_MAJOR (linux-$arch)"
  local base="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x" tmp file
  tmp=$(mktemp -d)
  curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  file=$(grep -m1 -oE "node-v[0-9.]+-linux-${arch}\.tar\.xz" "$tmp/SHASUMS256.txt" || true)
  [ -n "$file" ] || die "Couldn't find a Node.js download for linux-$arch."
  curl -fsSL "$base/$file" -o "$tmp/$file"
  (cd "$tmp" && grep " ${file}\$" SHASUMS256.txt | sha256sum -c --quiet -) || die "The Node.js download didn't match its checksum."
  tar -xJf "$tmp/$file" -C /usr/local --strip-components=1 --no-same-owner --exclude='*.md' --exclude=LICENSE
  rm -rf "$tmp"
  hash -r
  say "Node.js $(node -v) installed"
}
install_node
NODE_BIN="$(command -v node)"

# --------------------------------------------------------------- app files --
say "Copying HelpDesk Academy to $APP_DIR"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"
if [ "$SRC_DIR" != "$APP_DIR" ]; then
  rsync -a --delete --exclude '/data/' --exclude '/.env' --exclude '/node_modules/' --exclude '/.git/' "$SRC_DIR/" "$APP_DIR/"
fi
mkdir -p "$APP_DIR/data/backups"
chown -R root:root "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/data"
chmod 750 "$APP_DIR/data"
say "Installing app dependencies"
(cd "$APP_DIR" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)

# ---------------------------------------------------------------- settings --
ask() { # ask "Prompt" -> reply on stdout
  local reply
  read -r -p "$1" reply </dev/tty
  printf '%s' "$reply"
}
ask_secret() {
  local reply
  read -r -s -p "$1" reply </dev/tty
  printf '\n' >/dev/tty
  printf '%s' "$reply"
}
random_string() { # letters and digits only; no early-closing pipes (they'd trip pipefail)
  local s
  s=$(head -c 64 /dev/urandom | base64 -w0 | tr -dc 'A-Za-z0-9')
  printf '%s' "${s:0:$1}"
}
valid_value() { case "$1" in *'"'* | *'\'* | *'#'* | *' '*) return 1 ;; *) return 0 ;; esac; }

NEW_PASSWORD=""
write_env() {
  local groq domain code password public_url ip
  ip="$PUBLIC_IP"
  if [ "$HAS_TTY" -eq 1 ]; then
    echo
    echo "A few questions to set up your server (press Enter to accept the suggestion)."
    echo
    while :; do
      groq=$(ask_secret "Groq API key (starts with gsk_, typing is hidden): ")
      [ -z "$groq" ] && { warn "No key: the app will run in demo mode until you add GROQ_API_KEY."; break; }
      valid_value "$groq" && break
      warn "That doesn't look like a Groq key. Try again."
    done
    domain=$(ask "Free domain for HTTPS, e.g. myclass.duckdns.org (Enter to skip and use the IP address): ")
    domain="${domain#http://}"; domain="${domain#https://}"; domain="${domain%%/*}"
    code=$(ask "Class code students must enter (Enter for a random one): ")
    while [ -n "$code" ] && ! valid_value "$code"; do code=$(ask "Use letters and numbers only. Class code: "); done
    password=$(ask_secret "Instructor dashboard password (Enter to generate a strong one): ")
    while [ -n "$password" ] && { ! valid_value "$password" || [ "${#password}" -lt 10 ]; }; do
      password=$(ask_secret "At least 10 characters, no spaces, quotes, backslashes or #. Password: ")
    done
    if [ -z "$domain" ] && [ -z "$ip" ]; then ip=$(ask "This server's public IP address: "); fi
  else
    warn "No terminal to ask questions in. Writing a starter .env; edit it with: sudo nano $ENV_FILE"
    groq=""; domain=""; code=""; password=""
  fi
  [ -n "$code" ] || code="HD-$(random_string 6 | tr 'a-z' 'A-Z')"
  [ -n "$password" ] || { password=$(random_string 20); NEW_PASSWORD="$password"; }
  if [ -n "$domain" ]; then public_url="https://$domain"; elif [ -n "$ip" ]; then public_url="http://$ip"; else public_url=""; fi

  [ -f "$ENV_FILE" ] && cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d-%H%M%S)"
  umask 077
  cat >"$ENV_FILE" <<EOF
# HelpDesk Academy settings, written by setup.sh on $(date -u +%F).
# Edit with:   sudo nano $ENV_FILE
# Then apply:  sudo systemctl restart helpdesk-academy
# (If you change DOMAIN, re-run: sudo bash $APP_DIR/deploy/oracle/setup.sh)

AI_PROVIDER=groq
GROQ_API_KEY=$groq

CLASS_CODE=$code
INSTRUCTOR_PASSWORD=$password

# Public address students use. DOMAIN turns on automatic HTTPS.
PUBLIC_URL=$public_url
DOMAIN=$domain

# The app listens privately; Caddy (the web server in front) handles the internet side.
HOST=127.0.0.1
PORT=3300
TRUST_PROXY=1

# Optional tuning:
# CALLER_MODEL=openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b
# GRADER_MODEL=openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b
# MAX_MESSAGES_PER_ATTEMPT=40
EOF
  umask 022
}

if [ ! -f "$ENV_FILE" ] || [ "$RECONFIGURE" -eq 1 ]; then
  say "Settings"
  write_env
fi
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

env_get() { { grep -E "^$1=" "$ENV_FILE" || true; } | tail -n 1 | cut -d= -f2- | sed 's/^"//; s/"$//'; }
DOMAIN="$(env_get DOMAIN)"
PORT="$(env_get PORT)"; PORT="${PORT:-3300}"

# ---------------------------------------------------------------- firewall --
# Oracle's Ubuntu images block everything except SSH with iptables, even after
# you open the ports in the Oracle console. Open 80 (HTTP) and 443 (HTTPS).
say "Opening ports 80 and 443 in the server firewall"
UFW_ACTIVE=0
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then UFW_ACTIVE=1; fi
for p in 80 443; do
  if [ "$UFW_ACTIVE" -eq 1 ]; then
    ufw allow "$p/tcp" >/dev/null
  elif command -v iptables >/dev/null 2>&1; then
    iptables -C INPUT -p tcp -m state --state NEW --dport "$p" -j ACCEPT 2>/dev/null ||
      iptables -I INPUT 1 -p tcp -m state --state NEW --dport "$p" -j ACCEPT
  fi
done
# Oracle images save their iptables rules with netfilter-persistent; keep ours across reboots.
if [ "$UFW_ACTIVE" -eq 0 ] && command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save >/dev/null 2>&1 || warn "Couldn't save the firewall rules; re-run this script if the site stops loading after a reboot."
fi

# ------------------------------------------------------------------- caddy --
if ! command -v caddy >/dev/null 2>&1; then
  say "Installing Caddy (web server with automatic HTTPS)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' -o /etc/apt/sources.list.d/caddy-stable.list
  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y -qq
  apt-get install -y -qq caddy >/dev/null
fi

say "Configuring Caddy"
if [ -n "$DOMAIN" ]; then
  SITE="$DOMAIN"
  HSTS='		Strict-Transport-Security "max-age=31536000"'
else
  SITE=":80"
  HSTS=""
fi
cat >/etc/caddy/Caddyfile <<EOF
# Managed by HelpDesk Academy setup.sh. Re-running setup.sh overwrites this file.
$SITE {
	encode gzip
	reverse_proxy 127.0.0.1:$PORT
	header {
$HSTS
		X-Frame-Options "DENY"
		-Server
	}
}
EOF
caddy fmt --overwrite /etc/caddy/Caddyfile >/dev/null 2>&1 || true

# ----------------------------------------------------------------- service --
HAS_SYSTEMD=0
[ -d /run/systemd/system ] && HAS_SYSTEMD=1

cat >/etc/systemd/system/helpdesk-academy.service <<EOF
[Unit]
Description=HelpDesk Academy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
# Lock the app down: it can only write to its data folder.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR/data
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
EOF

# Daily database backup, kept for 14 days.
cat >/etc/cron.daily/helpdesk-academy-backup <<EOF
#!/bin/sh
d=$APP_DIR/data
[ -f "\$d/db.json" ] || exit 0
cp "\$d/db.json" "\$d/backups/db-\$(date +%F).json"
find "\$d/backups" -name 'db-*.json' -mtime +14 -delete
EOF
chmod 755 /etc/cron.daily/helpdesk-academy-backup

if [ "$HAS_SYSTEMD" -eq 1 ]; then
  say "Starting HelpDesk Academy"
  systemctl daemon-reload
  systemctl enable --now caddy >/dev/null 2>&1
  systemctl reload caddy 2>/dev/null || systemctl restart caddy
  systemctl enable helpdesk-academy >/dev/null 2>&1
  systemctl restart helpdesk-academy
else
  warn "systemd isn't running here, so the app and Caddy weren't started as services."
fi

# ------------------------------------------------------------------ check --
STATUS=""
if [ "$HAS_SYSTEMD" -eq 1 ]; then
  for _ in $(seq 1 20); do
    STATUS=$(curl -fsS "http://127.0.0.1:$PORT/api/status" 2>/dev/null) && break
    sleep 1
  done
fi
AI_LINE="unknown"
if [ -n "$STATUS" ]; then
  AI_LINE=$(printf '%s' "$STATUS" | "$NODE_BIN" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.aiMode==="live"?"LIVE":"DEMO MODE: "+j.aiReason)})')
fi

PUBLIC_URL="$(env_get PUBLIC_URL)"
echo
echo "================================================================"
if [ -n "$STATUS" ]; then
  echo "  HelpDesk Academy is running."
else
  echo "  HelpDesk Academy didn't respond yet. Check the log:"
  echo "    sudo journalctl -u helpdesk-academy -n 50"
fi
echo "================================================================"
SHOWN_URL="${PUBLIC_URL:-http://YOUR-SERVER-IP}"
echo "  Students go to:     $SHOWN_URL"
echo "  Instructor view:    $SHOWN_URL/instructor"
echo "  Class code:         $(env_get CLASS_CODE)"
if [ -n "$NEW_PASSWORD" ]; then
  echo "  Instructor password: $NEW_PASSWORD"
  echo "                       (write it down; it's also in $ENV_FILE)"
else
  echo "  Instructor password: the one in $ENV_FILE"
fi
echo "  AI:                 $AI_LINE"
echo
echo "  View the log:       sudo journalctl -u helpdesk-academy -f"
echo "  Change settings:    sudo nano $ENV_FILE"
echo "                      then: sudo systemctl restart helpdesk-academy"
if [ -n "$DOMAIN" ]; then
  echo
  echo "  HTTPS: Caddy is getting a certificate for $DOMAIN. If the site"
  echo "  doesn't load in a minute, check that $DOMAIN points to this server"
  echo "  and that ports 80 and 443 are open in the Oracle console."
fi
echo "================================================================"
