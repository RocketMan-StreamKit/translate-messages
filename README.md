# My StreamKit Addon

Integration addon for StreamKit+.

- **Addon id:** `translate-messages`
- **Type:** `platform.streaming`
- **Minimum StreamKit+:** `1.0.28`


## Development

1. Open **Settings** in StreamKit+ and install this folder.
2. Approve the requested permissions.
3. Enable the addon and configure settings.


## Build

```bash
npm install
npm run build
```

Install the `dist/` folder in StreamKit+ (contains `manifest.json`, worker, and assets).

## Release

This project uses a `REPO`-only addon id, so it is intended for **local development only** and cannot be published to the RocketMan catalog. You can still use the release workflow to build GitHub Release assets for personal distribution.

Docs: [StreamKit+ addon developer docs](https://rocketman-streamkit.github.io/types/)
