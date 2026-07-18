# Auto Translate Messages

Automatically translates chat messages and sends the translated version back to the chat.

- **Addon id:** `translate-messages`
- **Type:** `platform.streaming`
- **Minimum StreamKit+:** `1.0.42`

## Features

- Detects message language using built-in fastText
- Translates via Google Translate by default (no API key required)
- Optional LLM Access as a **second gate** after the built-in detector (skip unnecessary translations)
- Optional LLM translation with automatic fallback to Google Translate
- Two modes:
  - **Automatic** — translates every message from a different language
  - **By command** — translates only messages starting with a configurable prefix (default `!translate `), with optional auto-translate for specific usernames
- Skips emoji-only messages
- Skips messages already in the target language
- Caches translations and LLM detect-need answers to reduce API / token usage
- Settings button to clear the translation / LLM cache
- Sends translated messages to the same platform chat

## Settings

| Field | Description |
| --- | --- |
| Target language | Language to translate into (25 languages) |
| Mode | Automatic or by command |
| Command prefix | Prefix for command mode (default `!translate`) |
| Auto-translate users | Usernames whose messages auto-translate without prefix in command mode |
| Use LLM to decide if translation is needed | Second gate after the built-in detector; ignored if LLM Access is unavailable |
| Use LLM to translate instead of Google Translate | Prefer LLM for translation; falls back to Google Translate if unavailable |
| Clear translation cache | Removes cached Google Translate and LLM results so identical messages are processed again |

## Permissions

- `NETWORK_REQUEST` — Google Translate API calls
- `DASHBOARD_CHAT_INCOMING` — receive incoming chat messages
- `DASHBOARD_CHAT_SEND` — send translated messages to platform chats
- `NOTIFY` — in-app notifications
- `LLM` — optional LLM Access for detect-need / translation

## Development

```bash
npm install
npm run build
```

Install the `dist/` folder in StreamKit+ (Settings → Addons → Install folder).
