# IDM NoisTracker3 songs (50+ patterns each)

Three IDM-style songs for **NoisTracker3** (breakbeats, 303 bass, 808/909 drums), ready to publish to **Nostr** (kind 30303).

| File | Patterns | Length | BPM |
|------|----------|--------|-----|
| `idm-glitch-50.json` | 50 | 64 | 165 |
| `idm-break-52.json` | 52 | 64 | 148 |
| `idm-drill-55.json` | 55 | 32 | 172 |

## Publish to Nostr

1. Open **noistracker3.html** in your browser.
2. **Nostr**: Generate or import a key (nsec) in the Nostr panel.
3. Enter a **room name** (e.g. `idm-glitch-50`) and press Enter to join.
4. **Load the song**: use the tracker’s load/paste to load one of the JSON files from this folder (e.g. drag `idm-glitch-50.json` or paste its contents).
5. Click **Publish** in the Nostr panel to send the song to the room on the relay.

Repeat for each song (use a different room name per song if you like, e.g. `idm-break-52`, `idm-drill-55`).

Relay: `wss://relay.nomadwiki.org` (noistracker default).

## Regenerate

From the project root:

```bash
node scripts/generate-idm-songs.js
```

This overwrites the three JSON files in `idm-songs/`.
