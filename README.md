# Timedrop

A studio-focused **SoundCloud & YouTube Playlist Pacer** for rapid crate-digging and playlist auditioning. Drop in a playlist, pick a listening window, and let Timedrop step through tracks automatically.

## Features

- **SoundCloud & YouTube support** — Public SoundCloud sets, `on.soundcloud.com` links, secret share tokens (`/s-...`), YouTube playlists, and YouTube Music playlists.
- **Mixed playlist queue** — Chain SoundCloud and YouTube playlists together, reorder, inline-rename, loop, or undo clear.
- **Flexible pacing & cue offsets** — Custom window (`1–900s`) with presets (`10s`–`60s`), plus **Start (`0%`)**, **Drop-in (`25%`)**, **Middle (`50%`)**, and **Split (`0% + 50%`)** cue points.
- **Hold & Extend** — Freeze auto-advance on a track (`H`) or extend the active window by `+15s` (`+`).
- **Soft fade-out & master volume** — Optional `1.5s` fade-out before track changes and unified volume/mute (`M`) across both players.
- **Saved tracks & shareable sessions** — Bookmark tracks locally (`F`), copy your saved list, or share a URL with preconfigured pacing settings.
- **Studio Light & Dark themes** — Keyboard-first controls (`Space`/`K`, `←`/`→`, `H`, `+`, `M`, `F`, `S`, `R`, `L`).

## Local Development

```bash
npm install
npm run dev
```

## Build & Test

```bash
npm run build
npm test
```

## Deploying to Vercel

Timedrop is 100% client-side with zero API keys or environment variables required. Import this repository in Vercel and deploy with the default **Vite** preset (`npm run build` → `dist`).
