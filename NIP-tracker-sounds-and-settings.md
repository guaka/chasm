# NIP-XXX: Tracker Sound Packs and Track Settings

## Abstract

This NIP defines Nostr event kinds and content schemas for sharing **tracker sound packs** (instruments, synths, drum kits and their parameters) and **tracker track settings** (per-channel and global FX, track names, instrument assignments). It enables interoperability between Nostr-aware tracker clients (e.g. ChasmTracker/audio0-style Web Audio trackers) and allows users to publish and subscribe to sound packs and project settings on the relay network.

## Event kinds

| Kind   | Name              | Description |
|--------|-------------------|-------------|
| 31900  | Tracker Sound Pack | Instrument/synth and drum kit definitions (params, drum maps). |
| 31901  | Tracker Track Settings | Per-channel and global FX, track names, instrument assignments, mute/solo. |

---

## Kind 31900: Tracker Sound Pack

Used to publish a set of instruments (synths and/or drum machines) that a tracker can load. Content is JSON in the event `content` field.

### Tags

- `["d", "<identifier>"]` — Unique identifier for this sound pack (e.g. `chasm-default`, `my-808-pack`). Same `d` + same `pubkey` = replaceable/editable pack.
- `["name", "<human-readable name>"]` — Optional. Display name for the pack.
- `["t", "tracker"]` — Optional. Topic for discovery.
- `["client", "chasm", "audio0"]` — Optional. Client identifier for compatibility hints.

### Content (JSON)

The `content` field MUST be a JSON object with the following structure.

```json
{
  "v": 1,
  "name": "Chasm Default",
  "synthOrder": ["sine", "triangle", "saw", "square", "pluck", "sub", "pad", "noise", "303", "606", "808", "909"],
  "synths": {
    "<synth_id>": {
      "id": "sine",
      "name": "Sine Lead",
      "abbr": "SIN",
      "category": "synth",
      "waveType": "sine",
      "attack": 0.01,
      "decay": 0.1,
      "sustain": 0.7,
      "release": 0.3,
      "filterFreq": 4000,
      "filterQ": 2,
      "volume": 0.5,
      "engine": "303"
    }
  },
  "drumMaps": {
    "808": { "36": "kick", "38": "snare", "42": "hihat", "46": "openHihat" },
    "909": { "36": "kick", "38": "snare", "49": "crash", "51": "ride" },
    "606": { "36": "kick", "38": "snare", "42": "hihat", "46": "openHihat" }
  }
}
```

- **v** (integer): Schema version. Clients must ignore payloads with unknown `v`.
- **name** (string, optional): Human-readable name of the sound pack.
- **synthOrder** (array of string): Ordered list of synth IDs. Defines instrument indices (e.g. for pattern inst column).
- **synths** (object): Map of `synth_id` → synth definition.
  - **Synth entry**: `id`, `name`, `abbr`, `category` (`"synth"` | `"drums"`), `volume` (0–1).  
  - For synths: `waveType` (`sine`|`triangle`|`sawtooth`|`square`|`noise`), `attack`, `decay`, `sustain`, `release`, `filterFreq`, `filterQ`. Optional `engine` (e.g. `"303"`).
  - For drums: `engine` (`"606"`|`"808"`|`"909"`). Optional `is808`, `is909` (boolean).
- **drumMaps** (object, optional): Map of engine id → MIDI note → sound name (e.g. `"36": "kick"`). Keys are stringified MIDI note numbers.

---

## Kind 31901: Tracker Track Settings

Used to publish track-level and global settings (FX, names, instrument assignments). Content is JSON.

### Tags

- `["d", "<identifier>"]` — Unique identifier for this settings document (replaceable by same pubkey).
- `["a", "31900:<pubkey>:<sound_pack_d>"]` — Optional. Reference to a Kind 31900 sound pack this settings document is intended for.
- `["name", "<project name>"]` — Optional. Project/song name.

### Content (JSON)

```json
{
  "v": 1,
  "bpm": 125,
  "channels": 16,
  "patternLength": 64,
  "playbackMode": "song",
  "stepSize": 1,
  "currentOctave": 4,
  "trackNames": ["1", "2", "Kick", "Snare"],
  "trackInstruments": { "0": "sine", "1": "saw", "2": "808", "3": "808" },
  "mutedTracks": [],
  "soloedTracks": [],
  "channelFxSettings": {
    "0": {
      "filter": 255,
      "resonance": 0,
      "delaySend": 255,
      "reverbSend": 255,
      "distortion": 0,
      "flangerMix": 0,
      "flangerRate": 30
    }
  },
  "globalFx": {
    "delayTime": 0.3,
    "delayFeedback": 0.3,
    "reverbAmount": 0.3,
    "phaserMix": 0,
    "phaserRate": 0.5,
    "phaserDepth": 0.7
  }
}
```

- **v** (integer): Schema version.
- **bpm**, **channels**, **patternLength**, **playbackMode** (`"song"`|`"pattern"`), **stepSize**, **currentOctave**: Global playback/editor defaults.
- **trackNames** (array): Display name per channel index. Length may be less than `channels`; missing entries default to channel number.
- **trackInstruments** (object): Channel index (string key) → synth/instrument id from the sound pack (e.g. `"303"`, `"808"`).
- **mutedTracks** / **soloedTracks** (array of number): Channel indices.
- **channelFxSettings** (object): Channel index (string key) → FX object.
  - FX object: `filter`, `resonance`, `delaySend`, `reverbSend`, `distortion`, `flangerMix` (0–255), `flangerRate` (e.g. 5–200 for Hz×0.01 or float).
- **globalFx**: `delayTime`, `delayFeedback`, `reverbAmount` (0–1), `phaserMix`, `phaserRate`, `phaserDepth`.

All fields except `v` are optional. Clients should apply defaults for missing values.

---

## Querying

- **Sound packs**: `{"kinds": [31900], "authors": [...]}` or filter by `#d` tag.
- **Track settings**: `{"kinds": [31901], "authors": [...]}` or by `#a` to a specific sound pack.

---

## Compatibility

- Designed to match ChasmTracker (audio0) state: `SYNTH_CATALOG`, `SYNTH_ORDER`, `trackNames`, `trackInstruments`, `channelFxSettings`, `globalFx`. Clients may map local names (e.g. `tracker3_*` localStorage) to this schema for publish/import.

---

## Existing Nostr audio/media NIPs (different scope)

This NIP is about **tracker instruments and project settings** (synthesis params, FX, routing), not about distributing audio files or “now playing” status. The following existing specs cover other audio/media use cases:

| NIP / Kind | Purpose | Difference from this NIP |
|------------|---------|---------------------------|
| **NIP-92** (Media Attachments) | `imeta` tags for media URLs in any event (images, video, **audio**). MIME, blurhash, dim, alt, etc. | NIP-92 describes **files** (e.g. links to .mp3/.m4a). This NIP describes **instrument/synth definitions and mixer settings**, not audio file URLs. |
| **NIP-94** (Kind 1063) | File metadata: `url`, `m`, `x`, `size`, etc. for any file type (including audio). | Same as above: 1063 is for sharing **files**. Tracker sound packs are structured JSON (synth params, drum maps), not file binaries. |
| **NIP-38** (Kind 30315) | User status; `d` tag `"music"` = “now playing” (track name, optional link, expiration). | 30315 is **listening status**. This NIP is **sound design / project config** (which synths, which FX per channel). |
| **Kind 1073** | Music scrobbling (title, artist, album, external id). | Scrobbles = **play history**. This NIP = **instrument and FX setup** for a tracker/DAW. |
| **Kind 1222 / 1244** (voice) | Short voice messages (URL to audio file, e.g. m4a). | Voice = **recorded audio**. This NIP = **synthesizer and drum kit definitions + track settings**. |

So: **31900/31901** = shareable “patch/settings” data for tracker-style apps; **NIP-92/94** = shareable audio (or other) files; **30315/1073** = what you’re listening to or have scrobbled.

---

## References

- NIP-01: Basic protocol flow
- NIP-23: Long-form content (d tag, replaceable events)
- NIP-33: Parameterized replaceable events (`a` tag)
- NIP-38: User statuses (kind 30315, music status)
- NIP-92: Media attachments (`imeta`)
- NIP-94: File metadata (kind 1063)
- Schism Tracker: https://github.com/schismtracker/schismtracker
