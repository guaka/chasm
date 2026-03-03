/**
 * Nostr NIP-XXX Tracker Sound Packs and Track Settings
 * Data structures and helpers for Kind 31900 (sound pack) and Kind 31901 (track settings).
 * Matches audio0.html (ChasmTracker) state and SYNTH_CATALOG.
 */

// --- Kind constants ---
const NOSTR_TRACKER_KIND_SOUND_PACK = 31900;
const NOSTR_TRACKER_KIND_TRACK_SETTINGS = 31901;
const NOSTR_TRACKER_KIND_SONG = 30303;
const NOSTR_TRACKER_KIND_DELTA = 30304;

// --- Schema version ---
const SOUND_PACK_SCHEMA_VERSION = 1;
const TRACK_SETTINGS_SCHEMA_VERSION = 1;
const TRACKER_SONG_SCHEMA_VERSION = 1;
const TRACKER_DELTA_SCHEMA_VERSION = 1;

// --- Sound pack (Kind 31900) content structure ---
/**
 * @typedef {Object} SynthDef
 * @property {string} id
 * @property {string} name
 * @property {string} abbr
 * @property {'synth'|'drums'} category
 * @property {number} [volume] 0-1
 * @property {string} [waveType] sine|triangle|sawtooth|square|noise
 * @property {number} [attack] @property {number} [decay] @property {number} [sustain] @property {number} [release]
 * @property {number} [filterFreq] @property {number} [filterQ]
 * @property {string} [engine] '303'|'606'|'808'|'909'
 * @property {boolean} [is808] @property {boolean} [is909]
 */

/**
 * @typedef {Object} SoundPackContent
 * @property {number} v schema version
 * @property {string} [name]
 * @property {string[]} synthOrder
 * @property {Record<string, SynthDef>} synths
 * @property {Record<string, Record<string, string>>} [drumMaps] engineId -> midiNote -> soundName
 */

// --- Track settings (Kind 31901) content structure ---
/**
 * @typedef {Object} ChannelFx
 * @property {number} [filter] 0-255
 * @property {number} [resonance] 0-255
 * @property {number} [delaySend] 0-255
 * @property {number} [reverbSend] 0-255
 * @property {number} [distortion] 0-255
 * @property {number} [flangerMix] 0-255
 * @property {number} [flangerRate] e.g. 5-200 (0.05-2 Hz) or float
 */

/**
 * @typedef {Object} GlobalFx
 * @property {number} [delayTime] 0-1 (seconds)
 * @property {number} [delayFeedback] 0-1
 * @property {number} [reverbAmount] 0-1
 * @property {number} [phaserMix] 0-1
 * @property {number} [phaserRate] Hz
 * @property {number} [phaserDepth]
 */

/**
 * @typedef {Object} TrackSettingsContent
 * @property {number} v schema version
 * @property {number} [bpm] 32-255
 * @property {number} [channels]
 * @property {number} [patternLength] 1-256
 * @property {'song'|'pattern'} [playbackMode]
 * @property {number} [stepSize]
 * @property {number} [currentOctave] 0-9
 * @property {string[]} [trackNames]
 * @property {Record<string, string>} [trackInstruments] channelIndex -> synth id
 * @property {number[]} [mutedTracks]
 * @property {number[]} [soloedTracks]
 * @property {Record<string, ChannelFx>} [channelFxSettings]
 * @property {GlobalFx} [globalFx]
 */

// --- Build Kind 31900 content from audio0-style SYNTH_CATALOG + SYNTH_ORDER ---
/**
 * @param {Record<string, SynthDef>} synthCatalog - e.g. SYNTH_CATALOG from audio0.html
 * @param {string[]} synthOrder - e.g. SYNTH_ORDER
 * @param {Record<string, Record<number, string>>} [drumMaps] - e.g. DRUM_MAP_808, DRUM_MAP_909 (keys as numbers)
 * @param {string} [packName]
 * @returns {SoundPackContent}
 */
function buildSoundPackContent(synthCatalog, synthOrder, drumMaps = {}, packName = '') {
  const synths = {};
  for (const id of Object.keys(synthCatalog)) {
    const s = synthCatalog[id];
    synths[id] = {
      id: s.id,
      name: s.name,
      abbr: s.abbr,
      category: s.category || 'synth',
      volume: s.volume != null ? s.volume : 0.5
    };
    if (s.waveType) {
      synths[id].waveType = s.waveType;
      synths[id].attack = s.attack;
      synths[id].decay = s.decay;
      synths[id].sustain = s.sustain;
      synths[id].release = s.release;
      synths[id].filterFreq = s.filterFreq;
      synths[id].filterQ = s.filterQ;
    }
    if (s.engine) synths[id].engine = s.engine;
    if (s.is808) synths[id].is808 = true;
    if (s.is909) synths[id].is909 = true;
  }
  const out = {
    v: SOUND_PACK_SCHEMA_VERSION,
    name: packName,
    synthOrder: [...synthOrder],
    synths
  };
  const dm = {};
  if (drumMaps['808']) {
    dm['808'] = Object.fromEntries(Object.entries(drumMaps['808']).map(([k, v]) => [String(k), v]));
  }
  if (drumMaps['909']) {
    dm['909'] = Object.fromEntries(Object.entries(drumMaps['909']).map(([k, v]) => [String(k), v]));
  }
  if (drumMaps['606']) {
    dm['606'] = Object.fromEntries(Object.entries(drumMaps['606']).map(([k, v]) => [String(k), v]));
  }
  if (Object.keys(dm).length) out.drumMaps = dm;
  return out;
}

// --- Build Kind 31901 content from audio0 state ---
/**
 * @param {Object} state - audio0.html state object
 * @returns {TrackSettingsContent}
 */
function buildTrackSettingsContent(state) {
  const channelFxSettings = {};
  if (state.channelFxSettings && typeof state.channelFxSettings === 'object') {
    for (const k of Object.keys(state.channelFxSettings)) {
      const ch = parseInt(k, 10);
      if (!isNaN(ch)) channelFxSettings[k] = { ...state.channelFxSettings[k] };
    }
  }
  const trackInstruments = {};
  if (state.trackInstruments && typeof state.trackInstruments === 'object') {
    for (const k of Object.keys(state.trackInstruments)) {
      trackInstruments[k] = state.trackInstruments[k];
    }
  }
  return {
    v: TRACK_SETTINGS_SCHEMA_VERSION,
    bpm: state.bpm,
    channels: state.channels,
    patternLength: state.patternLength,
    playbackMode: state.playbackMode,
    stepSize: state.stepSize,
    currentOctave: state.currentOctave,
    trackNames: state.trackNames ? [...state.trackNames] : [],
    trackInstruments,
    mutedTracks: state.mutedTracks ? [...state.mutedTracks] : [],
    soloedTracks: state.soloedTracks ? [...state.soloedTracks] : [],
    channelFxSettings: Object.keys(channelFxSettings).length ? channelFxSettings : undefined,
    globalFx: state.globalFx ? { ...state.globalFx } : undefined
  };
}

// --- Apply Kind 31900 content into a synth catalog + order (for playback) ---
/**
 * @param {SoundPackContent} content
 * @returns {{ catalog: Record<string, SynthDef>, order: string[] }}
 */
function parseSoundPackContent(content) {
  if (!content || content.v !== SOUND_PACK_SCHEMA_VERSION) {
    return { catalog: {}, order: [] };
  }
  const catalog = {};
  for (const id of Object.keys(content.synths || {})) {
    catalog[id] = { ...content.synths[id] };
  }
  const order = Array.isArray(content.synthOrder) ? [...content.synthOrder] : [];
  return { catalog, order };
}

// --- Apply Kind 31901 content into audio0 state (partial apply) ---
/**
 * @param {TrackSettingsContent} content
 * @param {Object} state - mutable state object (e.g. audio0 state)
 */
function applyTrackSettingsContent(content, state) {
  if (!content || content.v !== TRACK_SETTINGS_SCHEMA_VERSION) return;
  if (content.bpm != null) state.bpm = Math.max(32, Math.min(255, content.bpm));
  if (content.channels != null) state.channels = content.channels;
  if (content.patternLength != null) state.patternLength = Math.max(1, Math.min(256, content.patternLength));
  if (content.playbackMode != null) state.playbackMode = content.playbackMode;
  if (content.stepSize != null) state.stepSize = content.stepSize;
  if (content.currentOctave != null) state.currentOctave = Math.max(0, Math.min(9, content.currentOctave));
  if (content.trackNames && content.trackNames.length) {
    content.trackNames.forEach((name, i) => { state.trackNames[i] = name; });
  }
  if (content.trackInstruments && typeof content.trackInstruments === 'object') {
    Object.assign(state.trackInstruments, content.trackInstruments);
  }
  if (content.mutedTracks) state.mutedTracks = [...content.mutedTracks];
  if (content.soloedTracks) state.soloedTracks = [...content.soloedTracks];
  if (content.channelFxSettings && typeof content.channelFxSettings === 'object') {
    for (const k of Object.keys(content.channelFxSettings)) {
      const ch = parseInt(k, 10);
      if (!isNaN(ch)) state.channelFxSettings[ch] = { ...content.channelFxSettings[k] };
    }
  }
  if (content.globalFx && typeof content.globalFx === 'object') {
    Object.assign(state.globalFx, content.globalFx);
  }
}

// --- Step packing (IT-inspired: short keys, omit empty) ---
const STEP_EMPTY = { note: '', vol: '', fxCmd: '', fxVal: '' };

/**
 * Pack a step for storage: short keys (n,v,fx,fv), omit empty fields. Reduces payload size.
 * Returns null for completely empty steps (caller should handle).
 * @param {{ note?: string, vol?: string, fxCmd?: string, fxVal?: string }} step
 * @returns {{ n?: string, v?: string, fx?: string, fv?: string }|null}
 */
function packStep(step) {
  if (!step) return null;
  const out = {};
  const n = (step.note !== undefined && step.note !== null) ? String(step.note) : (step.n != null ? String(step.n) : '');
  const v = (step.vol !== undefined && step.vol !== null) ? String(step.vol) : (step.v != null ? String(step.v) : '');
  const fx = (step.fxCmd !== undefined && step.fxCmd !== null) ? String(step.fxCmd) : (step.fx != null ? String(step.fx) : '');
  const fv = (step.fxVal !== undefined && step.fxVal !== null) ? String(step.fxVal) : (step.fv != null ? String(step.fv) : '');
  if (n) out.n = n;
  if (v) out.v = v;
  if (fx) out.fx = fx;
  if (fv) out.fv = fv;
  return Object.keys(out).length > 0 ? out : null;
}

function isStepEmpty(step) {
  if (!step) return true;
  const n = step.note || step.n || '';
  const v = step.vol || step.v || '';
  const fx = step.fxCmd || step.fx || '';
  const fv = step.fxVal || step.fv || '';
  return !n && !v && !fx && !fv;
}

/**
 * Unpack a step to full form (note, vol, fxCmd, fxVal). Accepts both short (n,v,fx,fv) and long keys.
 * @param {{ n?: string, note?: string, v?: string, vol?: string, fx?: string, fxCmd?: string, fv?: string, fxVal?: string }} packed
 * @returns {{ note: string, vol: string, fxCmd: string, fxVal: string }}
 */
function unpackStep(packed) {
  if (!packed) return { ...STEP_EMPTY };
  return {
    note: (packed.n != null ? packed.n : packed.note != null ? packed.note : ''),
    vol: (packed.v != null ? packed.v : packed.vol != null ? packed.vol : ''),
    fxCmd: (packed.fx != null ? packed.fx : packed.fxCmd != null ? packed.fxCmd : ''),
    fxVal: (packed.fv != null ? packed.fv : packed.fxVal != null ? packed.fxVal : '')
  };
}

/**
 * Pack a pattern's channels for storage. Uses sparse format: only non-empty steps stored as {row: packedStep}.
 * Empty channels are omitted entirely.
 */
function packPattern(pattern) {
  if (!pattern || !pattern.channels) return { channels: [], length: pattern?.length ?? 64 };
  const channels = [];
  for (let ci = 0; ci < pattern.channels.length; ci++) {
    const ch = pattern.channels[ci];
    if (!Array.isArray(ch)) { channels.push(null); continue; }
    const sparse = {};
    let hasData = false;
    for (let ri = 0; ri < ch.length; ri++) {
      const packed = packStep(ch[ri]);
      if (packed) { sparse[ri] = packed; hasData = true; }
    }
    channels.push(hasData ? sparse : null);
  }
  // Trim trailing null channels
  while (channels.length > 0 && channels[channels.length - 1] === null) channels.pop();
  return { channels, length: pattern.length ?? 64 };
}

/**
 * Unpack pattern from storage. Handles both sparse ({row: step}) and dense (array) channel formats.
 */
function unpackPattern(packed) {
  if (!packed || !packed.channels) return { channels: [], length: 64 };
  const patLen = packed.length ?? 64;
  return {
    channels: packed.channels.map((ch) => {
      if (!ch) {
        const empty = [];
        for (let i = 0; i < patLen; i++) empty.push({ ...STEP_EMPTY });
        return empty;
      }
      if (Array.isArray(ch)) return ch.map(unpackStep);
      // Sparse format: object with row indices as keys
      const rows = [];
      for (let i = 0; i < patLen; i++) {
        rows.push(ch[i] ? unpackStep(ch[i]) : { ...STEP_EMPTY });
      }
      return rows;
    }),
    length: patLen
  };
}

// --- Kind 30303: Tracker Song (build + apply) ---
/**
 * @param {Object} state - audio0-style state (patterns, order, trackNames, etc.)
 * @returns {Object} Song content JSON for kind 30303 (patterns packed: short keys, omit empty)
 */
function buildSongContent(state) {
  const patterns = (state.patterns || []).map(packPattern);
  const payload = {
    v: TRACKER_SONG_SCHEMA_VERSION,
    patterns,
    order: state.order,
    currentPattern: state.currentPattern ?? 0,
    channels: state.channels,
    patternLength: state.patternLength,
    bpm: state.bpm,
    playbackMode: state.playbackMode,
    stepSize: state.stepSize,
    trackNames: state.trackNames ? [...state.trackNames] : [],
    trackDevices: state.trackDevices ? [...state.trackDevices] : [],
    trackInstruments: state.trackInstruments ? { ...state.trackInstruments } : {},
    currentOctave: state.currentOctave,
    mutedTracks: state.mutedTracks ? [...state.mutedTracks] : [],
    soloedTracks: state.soloedTracks ? [...state.soloedTracks] : []
  };
  if (state.channelFxSettings && Object.keys(state.channelFxSettings).length) {
    payload.channelFxSettings = {};
    for (const k of Object.keys(state.channelFxSettings)) {
      payload.channelFxSettings[k] = { ...state.channelFxSettings[k] };
    }
  }
  if (state.globalFx) payload.globalFx = { ...state.globalFx };
  return payload;
}

/** Max content size for relays that limit event size (e.g. 256KB total, leave room for tags/sig). */
const TRACKER_SONG_MAX_CONTENT_BYTES = 240000;

/**
 * Build song content that fits within maxBytes (relay message limit).
 * Returns { content, truncated, originalPatterns, keptPatterns } so callers can warn the user.
 * @param {Object} state - audio0-style state
 * @param {number} [maxBytes] - default TRACKER_SONG_MAX_CONTENT_BYTES
 * @returns {{ content: Object, truncated: boolean, originalPatterns: number, keptPatterns: number }}
 */
function buildSongContentForRelay(state, maxBytes) {
  const max = maxBytes != null ? maxBytes : TRACKER_SONG_MAX_CONTENT_BYTES;
  const totalPatterns = (state.patterns || []).length;
  let content = buildSongContent(state);
  let json = JSON.stringify(content);
  if (json.length <= max) return { content, truncated: false, originalPatterns: totalPatterns, keptPatterns: totalPatterns };

  // Try keeping all patterns but only non-empty channels (already sparse from packPattern)
  // If still too big, progressively trim pattern count
  const patternLength = state.patternLength || 64;
  for (const maxPatterns of [totalPatterns, 32, 16, 8, 4]) {
    const patterns = (state.patterns || []).slice(0, maxPatterns).map(packPattern);
    const order = (state.order || []).filter((e) => {
      const idx = typeof e === 'number' ? e : e.pattern;
      return idx < maxPatterns;
    });
    if (order.length === 0 && state.order && state.order.length) order.push(state.order[0]);
    content = {
      v: TRACKER_SONG_SCHEMA_VERSION,
      patterns,
      order: order.length ? order : state.order,
      currentPattern: Math.min(state.currentPattern ?? 0, maxPatterns - 1),
      channels: state.channels,
      patternLength,
      bpm: state.bpm,
      playbackMode: state.playbackMode,
      stepSize: state.stepSize,
      trackNames: state.trackNames ? [...state.trackNames] : [],
      trackDevices: state.trackDevices ? [...state.trackDevices] : [],
      trackInstruments: state.trackInstruments ? { ...state.trackInstruments } : {},
      currentOctave: state.currentOctave,
      mutedTracks: state.mutedTracks ? [...state.mutedTracks] : [],
      soloedTracks: state.soloedTracks ? [...state.soloedTracks] : []
    };
    if (state.channelFxSettings && Object.keys(state.channelFxSettings).length) {
      content.channelFxSettings = {};
      for (const k of Object.keys(state.channelFxSettings)) {
        content.channelFxSettings[k] = { ...state.channelFxSettings[k] };
      }
    }
    if (state.globalFx) content.globalFx = { ...state.globalFx };
    json = JSON.stringify(content);
    if (json.length <= max) {
      return { content, truncated: maxPatterns < totalPatterns, originalPatterns: totalPatterns, keptPatterns: maxPatterns };
    }
  }
  return { content, truncated: true, originalPatterns: totalPatterns, keptPatterns: content.patterns.length };
}

/**
 * @param {Object} content - Parsed 30303 event content
 * @param {Object} state - Mutable tracker state
 */
function applySongContent(content, state) {
  if (!content || content.v !== TRACKER_SONG_SCHEMA_VERSION) return;
  if (Array.isArray(content.patterns) && content.patterns.length) {
    state.patterns = content.patterns.map(unpackPattern);
  }
  if (Array.isArray(content.order) && content.order.length) {
    state.order = content.order;
  }
  if (content.currentPattern != null) state.currentPattern = Math.max(0, content.currentPattern);
  if (content.channels != null) state.channels = Math.max(1, Math.min(256, content.channels));
  if (content.patternLength != null) state.patternLength = Math.max(1, Math.min(256, content.patternLength));
  if (content.bpm != null) state.bpm = Math.max(32, Math.min(255, content.bpm));
  if (content.playbackMode != null) state.playbackMode = content.playbackMode;
  if (content.stepSize != null) state.stepSize = content.stepSize;
  if (content.trackNames && content.trackNames.length) state.trackNames = [...content.trackNames];
  if (content.trackDevices && content.trackDevices.length) state.trackDevices = [...content.trackDevices];
  if (content.trackInstruments && typeof content.trackInstruments === 'object') {
    state.trackInstruments = { ...content.trackInstruments };
  }
  if (content.currentOctave != null) state.currentOctave = Math.max(0, Math.min(9, content.currentOctave));
  if (content.mutedTracks) state.mutedTracks = [...content.mutedTracks];
  if (content.soloedTracks) state.soloedTracks = [...content.soloedTracks];
  if (content.channelFxSettings && typeof content.channelFxSettings === 'object') {
    state.channelFxSettings = {};
    for (const k of Object.keys(content.channelFxSettings)) {
      const ch = parseInt(k, 10);
      if (!isNaN(ch)) state.channelFxSettings[ch] = { ...content.channelFxSettings[k] };
    }
  }
  if (content.globalFx && typeof content.globalFx === 'object') {
    Object.assign(state.globalFx, content.globalFx);
  }
}

// --- Kind 30304: Tracker delta (cell edits) ---
/**
 * @typedef {Object} DeltaChange
 * @property {number} p pattern index
 * @property {number} c channel
 * @property {number} r row
 * @property {string} [n] note
 * @property {string} [v] vol (hex)
 * @property {string} [fx] fxCmd
 * @property {string} [fv] fxVal
 */

/**
 * @param {DeltaChange[]} changes
 * @returns {Object} Content for kind 30304
 */
function buildDeltaContent(changes) {
  if (!Array.isArray(changes) || changes.length === 0) return null;
  return {
    v: TRACKER_DELTA_SCHEMA_VERSION,
    changes: changes.map(({ p, c, r, n, v, fx, fv }) => {
      const out = { p, c, r };
      if (n !== undefined) out.n = n;
      if (v !== undefined) out.v = v;
      if (fx !== undefined) out.fx = fx;
      if (fv !== undefined) out.fv = fv;
      return out;
    })
  };
}

/**
 * @param {Object} content - Parsed 30304 event content
 * @param {Object} state - Mutable tracker state
 */
function applyDeltaContent(content, state) {
  if (!content || content.v !== TRACKER_DELTA_SCHEMA_VERSION || !Array.isArray(content.changes)) return;
  const patterns = state.patterns;
  for (const ch of content.changes) {
    const p = ch.p;
    const c = ch.c;
    const r = ch.r;
    if (p < 0 || p >= patterns.length) continue;
    const pattern = patterns[p];
    if (!pattern.channels) pattern.channels = [];
    if (!pattern.channels[c]) {
      pattern.channels[c] = [];
      for (let i = 0; i < (state.patternLength || 64); i++) {
        pattern.channels[c].push({ note: '', vol: '', fxCmd: '', fxVal: '' });
      }
    }
    const row = pattern.channels[c][r];
    if (!row) {
      pattern.channels[c][r] = { note: '', vol: '', fxCmd: '', fxVal: '' };
    }
    const cell = pattern.channels[c][r];
    const full = unpackStep(ch);
    cell.note = full.note;
    cell.vol = full.vol;
    cell.fxCmd = full.fxCmd;
    cell.fxVal = full.fxVal;
  }
}

// --- Export for use in audio0 or other clients ---
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOSTR_TRACKER_KIND_SOUND_PACK,
    NOSTR_TRACKER_KIND_TRACK_SETTINGS,
    NOSTR_TRACKER_KIND_SONG,
    NOSTR_TRACKER_KIND_DELTA,
    SOUND_PACK_SCHEMA_VERSION,
    TRACK_SETTINGS_SCHEMA_VERSION,
    TRACKER_SONG_SCHEMA_VERSION,
    TRACKER_DELTA_SCHEMA_VERSION,
    buildSoundPackContent,
    buildTrackSettingsContent,
    packStep,
    unpackStep,
    isStepEmpty,
    packPattern,
    unpackPattern,
    buildSongContent,
    buildSongContentForRelay,
    TRACKER_SONG_MAX_CONTENT_BYTES,
    buildDeltaContent,
    parseSoundPackContent,
    applyTrackSettingsContent,
    applySongContent,
    applyDeltaContent
  };
}
