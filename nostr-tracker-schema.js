/**
 * Nostr NIP-XXX Tracker Sound Packs and Track Settings
 * Data structures and helpers for Kind 31900 (sound pack) and Kind 31901 (track settings).
 * Matches audio0.html (ChasmTracker) state and SYNTH_CATALOG.
 */

// --- Kind constants ---
const NOSTR_TRACKER_KIND_SOUND_PACK = 31900;
const NOSTR_TRACKER_KIND_TRACK_SETTINGS = 31901;

// --- Schema version ---
const SOUND_PACK_SCHEMA_VERSION = 1;
const TRACK_SETTINGS_SCHEMA_VERSION = 1;

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

// --- Export for use in audio0 or other clients ---
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOSTR_TRACKER_KIND_SOUND_PACK,
    NOSTR_TRACKER_KIND_TRACK_SETTINGS,
    SOUND_PACK_SCHEMA_VERSION,
    TRACK_SETTINGS_SCHEMA_VERSION,
    buildSoundPackContent,
    buildTrackSettingsContent,
    parseSoundPackContent,
    applyTrackSettingsContent
  };
}
