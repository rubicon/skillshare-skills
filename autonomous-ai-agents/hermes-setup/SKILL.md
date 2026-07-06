---
name: hermes-setup
description: "Configure Hermes Agent: providers, API keys, gateway platforms (Signal, Telegram, etc.)."
version: 1.0.0
author: agent
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [hermes, setup, configuration, gateway, signal, providers, api-keys]
    related_skills: [hermes-agent]
---

# Hermes Setup & Configuration

Practical workflows for configuring Hermes Agent — providers, API keys, and gateway platform setup. For the full CLI reference, load the `hermes-agent` skill.

**Docs:** https://hermes-agent.nousresearch.com/docs/user-guide/configuration

---

## Bring Your Own API Key (any provider)

1. Find your `.env` path:
   ```bash
   hermes config env-path
   # → ~/.hermes/.env
   ```

2. Add your key to `~/.hermes/.env`:
   ```bash
   OPENAI_API_KEY=sk-...
   # or ANTHROPIC_API_KEY, OPENROUTER_API_KEY, GOOGLE_API_KEY, etc.
   ```

3. Tell Hermes to use that provider — interactive picker (recommended):
   ```bash
   hermes model
   ```
   Or set directly:
   ```bash
   hermes config set model.provider openai
   hermes config set model.default gpt-4o
   ```

4. Verify:
   ```bash
   hermes doctor
   hermes status
   ```

### Provider → env var mapping (common ones)

| Provider | Env var |
|----------|---------|
| OpenAI (LLM) | `OPENAI_API_KEY` |
| OpenAI (TTS/STT) | `VOICE_TOOLS_OPENAI_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Google Gemini | `GOOGLE_API_KEY` or `GEMINI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| xAI / Grok | `XAI_API_KEY` |
| Nous Portal | OAuth via `hermes auth` |

> **Note:** TTS/STT with OpenAI uses `VOICE_TOOLS_OPENAI_KEY`, not `OPENAI_API_KEY`.

---

## Gateway Platform Setup

The gateway is the long-running process that connects Hermes to messaging platforms (Telegram, Discord, Signal, WhatsApp, etc.).

**Always start with the interactive wizard** — it checks dependencies, tests connectivity, and writes config for you:
```bash
hermes gateway setup
```

Start/manage the gateway:
```bash
hermes gateway              # Foreground (test first)
hermes gateway install      # Install as user service
hermes gateway start        # Start the service
hermes gateway status       # Check status
```

See `references/signal-setup.md` for a complete Signal + signal-cli walkthrough.
See `references/discord-setup.md` for a complete Discord bot setup walkthrough.

### Discord quick-start

1. Create a bot at https://discord.com/developers/applications
2. Bot page: Reset Token (copy it), enable **Message Content Intent** + **Server Members Intent**
3. OAuth2 URL Generator: scope=`bot`, permissions: View Channels + Send Messages + Read Message History + Embed Links + Attach Files, Integration Type=**Guild Install** → open generated URL → Authorize into your server
4. Enable Developer Mode in Discord (User Settings → Advanced) → right-click channel/server/user → Copy ID
5. Add to `~/.hermes/.env`:
   ```
   DISCORD_BOT_TOKEN=...
   DISCORD_SERVER_ID=<server-id>
   DISCORD_CHANNEL_ID=<channel-id>
   DISCORD_HOME_CHANNEL=<channel-id>
   DISCORD_ALLOWED_USERS=<your-discord-user-id>   # REQUIRED — bot silently ignores everyone without this
   ```
6. `hermes gateway restart`
7. To allow a channel to receive responses **without** @ mentions (e.g. a dedicated #hermes channel):
   ```bash
   hermes config set gateway.discord.free_response_channels "<channel-id>"
   hermes gateway restart
   ```
   This sets `gateway.discord.free_response_channels` in `~/.hermes/config.yaml`. The old `DISCORD_IGNORE_NO_MENTION=false` env var is superseded by this config key.

### Discord recommended bot permissions (personal server with management)

**General:** View Audit Log, Manage Server, Manage Roles, Manage Channels, Kick Members, Ban Members, Manage Nicknames, Manage Webhooks, Manage Events, Create Events, Moderate Members

**Text:** Send Messages, Read Message History, Embed Links, Attach Files, Create Public Threads, Create Private Threads, Send Messages in Threads, Manage Messages, Pin Messages, Manage Threads, Add Reactions, Use External Emojis, Use Slash Commands, Create Polls

**Voice (optional):** Connect, Speak, Mute Members, Deafen Members, Move Members

**Skip:** Administrator (too broad), Send TTS Messages, Bypass Slowmode

> After changing permissions in the Developer Portal, kick the bot and re-invite it with the new OAuth URL for changes to take effect.

---

## Enabling Optional Tools

### agent-browser (browser automation)

```bash
cd ~/.hermes/hermes-agent
npm install
# npm will warn about install scripts not yet approved — approve them all:
npm approve-scripts agent-browser electron esbuild fsevents node-pty unicode-animations electron-winstaller
npm install   # re-run after approving; should complete cleanly
```

### computer_use (macOS desktop control)

Hermes ships a one-command installer:
```bash
hermes computer-use install
```

This installs `cua-driver` (the CUA backend) to `~/.local/bin/cua-driver`.

After install, grant macOS permissions — **run this from your terminal** (not the agent), as it opens TCC dialogs that must say "Cua Driver":
```bash
/Users/$USER/.local/bin/cua-driver permissions grant
```

Approve both **Accessibility** and **Screen Recording** prompts. Once granted, `computer_use` will pass `hermes doctor`.

> **Note:** `hermes computer-use install` may print a final "did not complete" warning even when the binary installed correctly. Check `which cua-driver` or `cua-driver --version` to confirm success.

### browser-cdp

`browser-cdp` is **not an install step** — it only activates when a Chrome DevTools Protocol endpoint is explicitly connected via `/browser connect` in session or `BROWSER_CDP_URL` in config. The `hermes doctor` warning is expected until you connect a browser instance.

---

## Pitfalls

- **TTS/STT OpenAI key is separate** — it's `VOICE_TOOLS_OPENAI_KEY`, not `OPENAI_API_KEY`. Easy to miss.
- **Tool/config changes need a new session** — run `/reset` in chat, or restart the CLI/gateway after config edits.
- **signal-cli is NOT in apt/snap** — must install from GitHub releases on Linux (see references/signal-setup.md).
- **`brew install signal-cli` does NOT install Java (macOS)** — signal-cli silently fails with "Unable to locate a Java Runtime." Fix: `brew install openjdk@21` and add it to PATH. See references/signal-setup.md.
- **Never relay `signal-cli link` QR codes through the agent** — QR codes expire in ~20-30s, and ASCII QR codes don't render cleanly in chat UIs. Always instruct the user to run `signal-cli link -n "HermesAgent"` directly in their own terminal where the QR renders instantly and correctly.
- **"The user already exists" on re-link** — stale data from a prior link attempt. signal-cli will tell you exactly which directory to delete (e.g. `~/.local/share/signal-cli/data/866557`). Delete it, then re-run `signal-cli link`.
- **`timeout` command missing on macOS** — GNU coreutils not installed by default. Use `brew install coreutils` (adds `gtimeout`) or avoid `timeout` entirely.
- **Always set access controls on gateway** — the bot has terminal access by default. Without `*_ALLOWED_USERS` or DM pairing, that's a security risk.
- **Hermes secret redaction corrupts config files containing phone numbers** — when the agent writes files (launchd plists, config files, etc.) containing phone numbers through file tools, Hermes silently redacts them (e.g. `+18177153292` → `+181****3292`). The result is a broken config. **Never write phone numbers through agent file tools.** Either instruct the user to write the file themselves, or fix after: `sed -i '' 's/+NNN\*\*\*\*XXXX/+NNNXXXXXXX/' <file>` (with real numbers supplied by the user in their terminal).
- **`hermes gateway setup <platform>` doesn't work** — the setup subcommand takes no platform argument. Just run `hermes gateway setup` (interactive). If you've already written the env vars manually, you can skip the wizard entirely — env vars alone are sufficient; restart the gateway to pick them up.
- **`npm install` for agent-browser needs script approval first** — npm blocks install scripts by default. Run `npm approve-scripts agent-browser electron esbuild fsevents node-pty unicode-animations electron-winstaller` then re-run `npm install`.
- **`hermes computer-use install` may print "did not complete" even when successful** — the binary installs fine; the warning is a false alarm from the post-install check. Verify with `cua-driver --version` or `which cua-driver`.
- **`cua-driver` not on PATH after install** — the installer appends a PATH update to `~/.zshrc` but doesn't source it for the current shell. Run `export PATH="$HOME/.local/bin:$PATH"` (or open a new terminal) after install. Verify with `which cua-driver`.
- **`computer_use` still fails `hermes doctor` after installing cua-driver** — permissions (Accessibility + Screen Recording) must be granted explicitly. Run `/Users/$USER/.local/bin/cua-driver permissions grant` from your own terminal (not the agent) — this opens TCC dialogs that must say "Cua Driver" as the requesting app so the grant sticks to the driver identity, not your terminal.
- **`browser-cdp` in `hermes doctor` is not an install problem** — it only activates when a CDP endpoint is connected (`/browser connect` or `BROWSER_CDP_URL`). The warning is expected until then.
- **macOS launchd plist for signal-cli: use the native binary, not java -jar** — `brew install signal-cli` installs a native binary at `/opt/homebrew/bin/signal-cli`, not a jar file. In the plist, call the binary directly and set `EnvironmentVariables.PATH` to include openjdk. See `references/signal-setup.md`.
- **Discord: Message Content Intent is mandatory** — without it the bot joins but silently ignores all messages. Enable it on the Bot page → Privileged Gateway Intents.
- **Discord: token is shown only once** — if missed, click Reset Token (old token immediately invalidated).
- **Discord: Integration Type should be "Guild Install"** — the correct and default value; don't change it.
- **Discord: Developer Mode required to copy IDs** — User Settings → Advanced → Developer Mode, then right-click channel/server/user to copy IDs.
- **Discord: `hermes gateway restart` needed after adding token** — not just `start`; the gateway must fully restart to pick up new env vars.
- **Discord: bot silently ignores all messages without `DISCORD_ALLOWED_USERS`** — no error in logs, no response, nothing. Always set `DISCORD_ALLOWED_USERS=<your-user-id>`. Get your user ID by right-clicking your username in any channel with Developer Mode enabled.
- **Discord: `DISCORD_IGNORE_NO_MENTION=false` alone does NOT enable no-mention responses** — there is a second gate in `on_message`. For plain messages (no @mentions), the channel must also be in `free_response_channels`. The correct fix:
  ```bash
  hermes config set gateway.discord.free_response_channels "<channel-id>"
  hermes gateway restart
  ```
  The `DISCORD_IGNORE_NO_MENTION` env var is superseded by this config key. Setting the env var without `free_response_channels` silently does nothing. Verify: `grep free_response_channels ~/.hermes/config.yaml`
- **Discord: `free_response_channels` is empty by default** — must be explicitly set for every channel you want to respond in without @ mentions.
- **Email gateway loop: never include the bot's own sending address in `EMAIL_ALLOWED_USERS`** — if `EMAIL_ADDRESS=dax+hermes@daxdavis.com` (the address Hermes sends from) is listed in `EMAIL_ALLOWED_USERS`, Hermes will reply to its own outbound emails, creating an infinite loop. Fix: remove the bot address from `EMAIL_ALLOWED_USERS` and add it to `EMAIL_IGNORED_SENDERS`. Then stop the gateway, delete the looping email session (`hermes sessions delete <id>`), and restart. The session ID is visible in the gateway log as `session=YYYYMMDD_HHMMSS_<hash>`.
- **Email loop — stop the gateway immediately** — if an email loop is detected, run `launchctl stop ai.hermes.gateway` first before anything else, then fix config, delete the session, and restart. Leaving the gateway running while fixing config does not stop the loop since the old session is still in memory.
- **`hermes gateway restart` can take 3+ minutes** — the gateway drains active agents before shutting down (180s timeout). Don't assume it's stuck; watch `tail -f ~/.hermes/logs/agent.log` for \"Gateway stopped\" before considering a force-restart. If the service is still alive under launchd (`launchctl list | grep hermes.gateway` shows a PID), it's still running.
- **After a long gateway shutdown, launchd may not auto-restart** — if `launchctl list | grep hermes.gateway` shows no PID and no recent startup in the log, run `launchctl start ai.hermes.gateway` manually to kick it.
- **`hermes doctor`** is your first stop for any provider/model issue.
