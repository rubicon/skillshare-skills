# Discord + Hermes Setup

Source: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal (gateway docs)

Hermes connects to Discord via a bot token. The `discord` toolset requires `DISCORD_BOT_TOKEN` in `.env`.

---

## Step 1: Create a Discord Application & Bot

1. Go to **https://discord.com/developers/applications**
2. Click **New Application** → name it (e.g. "Hermes")
3. Go to **Bot** in the left sidebar

---

## Step 2: Configure Bot Settings

On the **Bot** page:

- Click **Reset Token** → copy the token immediately (only shown once)
- Under **Privileged Gateway Intents**, enable:
  - ✅ **Message Content Intent** — required for Hermes to read message content
  - ✅ **Server Members Intent** — recommended

---

## Step 3: Invite the Bot to Your Server

On the **OAuth2 → URL Generator** page:

- **Scopes:** check `bot`
- **Integration Type:** `Guild Install` (correct default — leave as-is)
- **Bot Permissions** — minimum for basic use:
  - ✅ View Channels (General)
  - ✅ Send Messages
  - ✅ Read Message History
  - ✅ Embed Links
  - ✅ Attach Files
- **Bot Permissions** — add these if you want Hermes to help manage the server:
  - General: View Audit Log, Manage Server, Manage Roles, Manage Channels, Kick Members, Ban Members, Manage Nicknames, Manage Webhooks, Manage Events, Create Events, Moderate Members
  - Text: Create Public/Private Threads, Send Messages in Threads, Manage Messages, Pin Messages, Manage Threads, Add Reactions, Use External Emojis, Use Slash Commands, Create Polls, Mention Everyone
  - Voice: Connect, Speak, Mute Members, Deafen Members, Move Members
  - ❌ Skip: Administrator (too broad), Send TTS Messages, Bypass Slowmode
- Copy the **Generated URL** and open it in your browser
- Select your server → click **Authorize**

> **Changing permissions later:** Bot permissions are baked into the OAuth invite URL. If you update permissions in the Developer Portal, you must **kick the bot** from your server and **re-invite it** using a new OAuth URL with the updated permissions checked. The new permissions only take effect after re-invite.

---

## Step 4: Get Channel and Server IDs

Enable **Developer Mode** in Discord:
- User Settings → Advanced → Developer Mode ✅

Then:
- Right-click your **#hermes channel** → **Copy Channel ID**
- Right-click your **server name** → **Copy Server ID**

---

## Step 5: Configure Hermes

Add to `~/.hermes/.env`:

```bash
# Discord
DISCORD_BOT_TOKEN=your-token-here
DISCORD_HOME_CHANNEL=your-channel-id     # e.g. 123456789012345678
DISCORD_ALLOWED_USERS=your-user-id       # right-click your username → Copy User ID
```

> **Critical:** Without `DISCORD_ALLOWED_USERS`, the bot silently drops ALL messages — no response, no error in logs, nothing. Always set it to at least your own user ID.

**How to get your own Discord user ID:**
- With Developer Mode enabled: right-click your **username** in any channel → **Copy User ID**

Then restart the gateway:
```bash
hermes gateway restart
```

Verify it connected:
```bash
tail -20 ~/.hermes/logs/gateway.log | grep -i discord
# Should show: ✓ discord connected
```

### Enabling a channel to respond without @ mentions

By default (`DISCORD_IGNORE_NO_MENTION=true`), the bot only responds in server channels when directly @mentioned. For a dedicated #hermes channel that responds to all messages:

```bash
# Preferred: config key (more reliable than env var)
hermes config set gateway.discord.free_response_channels "YOUR_CHANNEL_ID"
hermes gateway restart
```

> **Why not just `DISCORD_IGNORE_NO_MENTION=false`?** This env var alone is insufficient. The `on_message` handler has a second gate: even with `IGNORE_NO_MENTION=false`, plain messages (no @mentions at all) are only passed through if the channel is in `free_response_channels`. Setting the config key is the correct and complete fix. The env var approach is superseded.

---

## Pitfalls

- **Message Content Intent is mandatory** — without it, the bot joins but silently ignores all messages. Enable it on the Bot page under Privileged Gateway Intents.
- **Token is shown only once** — if you forget to copy it, click Reset Token to generate a new one (the old token is immediately invalidated).
- **Integration Type: Guild Install** — this is correct and the default. Do not change it.
- **Developer Mode required for IDs** — you cannot right-click to copy channel/server/user IDs without Developer Mode enabled.
- **Bot permissions in OAuth2 URL Generator** — the "Send Messages" and "Read Message History" permissions shown in the Bot Permissions section of the OAuth2 URL Generator are separate from the Bot page permissions. Set them in the URL Generator to generate the correct invite URL.
- **`discord_admin` toolset** also requires `DISCORD_BOT_TOKEN` — same token, no extra credential.
- **After adding token to .env**, run `hermes gateway restart` (not just `hermes gateway start`) — the gateway must fully restart to pick up new env vars.
- **Bot silently ignores all messages without `DISCORD_ALLOWED_USERS`** — there is no error in the logs, no response, nothing. The on_message handler silently returns when the sender is not in the allowlist. Always set `DISCORD_ALLOWED_USERS` to at least your own user ID. Get it by right-clicking your username in any channel (requires Developer Mode).
- **`DISCORD_IGNORE_NO_MENTION=false` alone is NOT enough to get no-mention responses** — there is a second gate in `on_message`: plain messages (zero mentions) are only passed through if the channel is listed in `free_response_channels`. The correct fix is `hermes config set gateway.discord.free_response_channels "CHANNEL_ID"` + `hermes gateway restart`. Setting the env var without the config key has no visible effect and produces no error.

---

## Env Vars Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Bot token from Developer Portal |
| `DISCORD_HOME_CHANNEL` | Recommended | Channel ID for cron job delivery |
| `DISCORD_ALLOWED_USERS` | Recommended | User IDs allowed to interact (comma-separated) |
| `DISCORD_ALLOWED_SERVERS` | Optional | Server IDs to restrict to |
