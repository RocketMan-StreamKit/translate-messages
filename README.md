# Auto Translate Messages

Automatically translates chat messages and sends the translated version back to the chat.

- **Addon id:** `translate-messages`
- **Type:** `platform.streaming`
- **Minimum StreamKit+:** `1.0.30`

## Features

- Detects message language using built-in fastText
- Translates via Google Translate (no API key required)
- Two modes:
  - **Automatic** — translates every message from a different language
  - **By command** — translates only messages starting with a configurable prefix (default `!translate `), with optional auto-translate for specific usernames
- Skips emoji-only messages
- Skips messages already in the target language
- Caches translations to reduce API calls
- Sends translated messages to the same platform chat

## Settings

| Field | Description |
| --- | --- |
| Target language | Language to translate into (25 languages) |
| Mode | Automatic or by command |
| Command prefix | Prefix for command mode (default `!translate`) |
| Auto-translate users | Usernames whose messages auto-translate without prefix in command mode |

## Permissions

- `NETWORK_REQUEST` — Google Translate API calls
- `DASHBOARD_CHAT_INCOMING` — receive incoming chat messages
- `DASHBOARD_CHAT_SEND` — send translated messages to platform chats
- `NOTIFY` — in-app notifications

## Development

```bash
npm install
npm run build
```

Install the `dist/` folder in StreamKit+ (Settings → Addons → Install folder).
