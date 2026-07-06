# Signal + Hermes Setup

Source: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal

Hermes connects to Signal through the **signal-cli daemon** running in HTTP mode.
Streams messages via SSE, sends responses via JSON-RPC. No extra Python deps — uses `httpx`.

---

## Prerequisites

- **signal-cli** — Java-based ([GitHub: AsamK/signal-cli](https://github.com/AsamK/signal-cli))
- **Java 17+** runtime
- **Phone with Signal installed** — signal-cli links as a secondary device (like WhatsApp Web)

---

## Install signal-cli

**macOS:**
```bash
brew install signal-cli
# signal-cli requires Java 17+ — brew installs the binary but NOT Java.
# Check: java -version
# If missing: brew install openjdk@21
# Then add to PATH permanently:
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
```

**Linux** (NOT in apt/snap — download from GitHub releases):
```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} \
  https://github.com/AsamK/signal-cli/releases/latest | sed 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}.tar.gz"
sudo tar xf "signal-cli-${VERSION}.tar.gz" -C /opt
sudo ln -sf "/opt/signal-cli-${VERSION}/bin/signal-cli" /usr/local/bin/
```

---

## Step 1: Link Your Signal Account

```bash
signal-cli link -n "HermesAgent"
```

On your phone: **Settings → Linked Devices → Link New Device** → scan the QR code.

---

## Step 2: Start the signal-cli Daemon

```bash
# E.164 format, e.g. +15551234567
signal-cli --account +1234567890 daemon --http 127.0.0.1:8080
```

Keep running in background (tmux, screen, or systemd). Verify:
```bash
curl http://127.0.0.1:8080/api/v1/check
# → {"versions":{"signal-cli":...}}
```

---

## Step 3: Configure Hermes

**Interactive wizard (recommended):**
```bash
hermes gateway setup   # select Signal
```

**Manual** — add to `~/.hermes/.env`:
```bash
# Required
SIGNAL_HTTP_URL=http://127.0.0.1:8080
SIGNAL_ACCOUNT=+1234567890

# Security — strongly recommended (bot has terminal access!)
SIGNAL_ALLOWED_USERS=+1234567890,+0987654321   # E.164 or UUIDs, comma-separated

# Optional
SIGNAL_GROUP_ALLOWED_USERS=groupId1,groupId2   # or * for all groups; omit = groups disabled
SIGNAL_HOME_CHANNEL=+1234567890                # default cron delivery target
SIGNAL_ALLOW_ALL_USERS=true                    # skip allowlist (use with caution)
```

---

## Step 4: Start the Gateway

```bash
hermes gateway              # foreground (test first)
hermes gateway install      # install as background user service
```

> **Skip the wizard if you already wrote .env manually** — Signal will show as "configured" in `hermes gateway setup` automatically. Just restart the gateway to pick up the new env vars: `hermes gateway restart`.

> **`hermes gateway setup signal` does not work** — the subcommand doesn't accept a platform name argument. Run `hermes gateway setup` (interactive, no args) or skip it entirely when configuring via .env.

---

## macOS: Auto-start signal-cli Daemon via launchd

Create `~/Library/LaunchAgents/com.signal-cli.daemon.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.signal-cli.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/signal-cli</string>
        <string>--account</string>
        <string>+1234567890</string>
        <string>daemon</string>
        <string>--http</string>
        <string>127.0.0.1:8080</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/opt/openjdk@21/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/signal-cli.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/signal-cli.log</string>
</dict>
</plist>
```

> **Important:** Use `/opt/homebrew/bin/signal-cli` (the native binary) directly — NOT a java `-jar` invocation. On macOS, `brew install signal-cli` installs a native binary wrapper, not a jar. The `EnvironmentVariables` dict must include the openjdk PATH so the binary can find Java at launch time.

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.signal-cli.daemon.plist
```

Verify daemon is up:
```bash
lsof -i :8080 | grep LISTEN   # should show signal-cl
curl -v http://127.0.0.1:8080/api/v1/check   # HTTP 200 OK (body is empty — that's correct)
```

> **Note:** `curl http://127.0.0.1:8080/api/v1/check` returns HTTP 200 with an **empty body** (0 content-length) on success — not the JSON shown in the docs. Use `curl -v` to see the status code and confirm it's healthy.

---

## Features

- **Note to Self** — link signal-cli to your own number, message yourself → Hermes responds. No config needed; works automatically when `SIGNAL_ACCOUNT` matches your number.
- **Attachments** — images (PNG/JPEG/GIF/WebP), audio (transcribed if Whisper configured), PDF, video, ZIP. Up to 100 MB.
- **Native formatting** — bold, italic, code blocks render as Signal `bodyRanges` (not raw `**`).
- **Typing indicators** — sent while processing, refreshes every 8 seconds.
- **No message editing** — Signal doesn't support it; tool-progress bubbles are suppressed on Signal even with `/verbose`.
- **Auto-reconnect** — exponential backoff 2s → 60s on SSE drop; pings signal-cli after 120s of inactivity.
- **Phone number redaction** — `+15551234567 → +155****4567` in all logs.

---

## Access Control

| Config | Behavior |
|--------|----------|
| `SIGNAL_ALLOWED_USERS` set | Only those users can DM |
| Not set | Unknown users get a pairing code; approve via `hermes pairing approve signal CODE` |
| `SIGNAL_ALLOW_ALL_USERS=true` | Anyone can message (use with caution) |
| `SIGNAL_GROUP_ALLOWED_USERS` not set | Groups ignored, DM only |
| `SIGNAL_GROUP_ALLOWED_USERS=*` | Responds in any group it's a member of |

---

## Linking: Always Have the User Run It Directly

**Do NOT try to run `signal-cli link` from the agent and relay the QR code.** Two compounding problems make this unreliable:

1. **QR codes expire in ~20-30 seconds** — by the time the agent captures the URI, renders it, and it appears in chat, it's already expired. Multiple retries waste the user's time.
2. **ASCII QR codes don't render cleanly enough in chat** to be scannable — monospace font rendering in messaging UIs is inconsistent.

**The correct approach:** tell the user to run this themselves in their terminal:

```bash
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"   # macOS only, if Java not already on PATH
signal-cli link -n "HermesAgent"
```

signal-cli prints a `sgnl://` URI and an inline QR code directly to their terminal, where it renders correctly and can be scanned immediately.

If you need to capture the URI for automation (headless/no user present), redirect to file:
```bash
signal-cli link -n "HermesAgent" > /tmp/signal-link.txt 2>&1
# wait for it to complete (it blocks until scanned or times out)
cat /tmp/signal-link.txt
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "The user +NNN already exists / Delete ... before trying again" | Stale data from a prior link attempt. Delete the directory signal-cli tells you to (e.g. `rm -rf ~/.local/share/signal-cli/data/866557`) then re-run `signal-cli link`. |
| `java: command not found` (macOS) | `brew install openjdk@21`, then `echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc && export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"` |
| `signal-cli link` produces no output | Output goes to real TTY; redirect: `signal-cli link -n "HermesAgent" > /tmp/signal-link.txt 2>&1` |
| launchd plist uses `java -jar` and fails | On macOS brew, signal-cli is a native binary at `/opt/homebrew/bin/signal-cli` — not a jar. Use the binary directly and pass Java via `EnvironmentVariables.PATH` in the plist. |
| launchd plist has redacted phone number (`+181****3292`) | Hermes secret redaction silently replaces phone numbers when writing files through agent tools. **Never write the plist through agent file tools.** Either have the user write it manually, or fix after the fact: `sed -i '' 's/+181\*\*\*\*3292/+18177153292/' ~/Library/LaunchAgents/com.signal-cli.daemon.plist` (substituting the real number). |
| `curl /api/v1/check` returns empty output | Normal — HTTP 200 with empty body means healthy. Use `curl -v` to see the status code. |
| `hermes gateway setup signal` gives "unrecognized arguments" | The setup subcommand takes no platform argument. Run `hermes gateway setup` (interactive) or skip entirely — env vars in `.env` are sufficient. |
| `timeout: command not found` (macOS) | macOS has no GNU `timeout`; install with `brew install coreutils` (adds `gtimeout`), or avoid it |
| "Cannot reach signal-cli" | Ensure daemon is running: `signal-cli --account +NUMBER daemon --http 127.0.0.1:8080` |
| Messages not received | Check `SIGNAL_ALLOWED_USERS` has sender's number in E.164 format (with `+`) |
| "signal-cli not found on PATH" | Install signal-cli and ensure it's in PATH (macOS: `brew install signal-cli`) |
| Connection keeps dropping | Check signal-cli logs; ensure Java 17+ is installed |
| Group messages ignored | Set `SIGNAL_GROUP_ALLOWED_USERS` with group IDs or `*` |
| Bot responds to no one | Set `SIGNAL_ALLOWED_USERS` or use DM pairing |
| Duplicate messages | Ensure only one signal-cli instance is listening on your number |

---

## Security Notes

- `~/.local/share/signal-cli/` contains account credentials — protect like a password.
- signal-cli session data is the crown jewel; set filesystem permissions accordingly.
- Signal's E2E encryption protects content in transit, but the agent can still act on it once received.
