#!/usr/bin/env node
/**
 * Generate 3 NoisTracker3-compatible IDM-style songs for Nostr (kind 30303).
 * Each song has 50+ patterns, breakbeats, 303 bass, 808/909 drums.
 * Output: JSON files that can be loaded in noistracker3.html and published to a room.
 */

const fs = require('fs');
const path = require('path');

const TRACKER_SONG_SCHEMA_VERSION = 1;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNote(midi) {
  const oct = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + oct;
}

// 808: 36 kick, 38 snare, 42 hihat, 46 openHihat, 39 clap, 43 lowTom, 47 midTom, 50 hiTom
const KICK = 36, SNARE = 38, HIHAT = 42, OPENHAT = 46, CLAP = 39, LOWTOM = 43, MIDTOM = 47, HITOM = 50;

function packStep(step) {
  if (!step) return null;
  const n = (step.note !== undefined && step.note !== null) ? String(step.note) : '';
  const v = (step.vol !== undefined && step.vol !== null) ? String(step.vol) : '';
  const fx = (step.fxCmd !== undefined && step.fxCmd !== null) ? String(step.fxCmd) : '';
  const fv = (step.fxVal !== undefined && step.fxVal !== null) ? String(step.fxVal) : '';
  const out = {};
  if (n) out.n = n;
  if (v) out.v = v;
  if (fx) out.fx = fx;
  if (fv) out.fv = fv;
  return Object.keys(out).length > 0 ? out : null;
}

function packPattern(pattern) {
  if (!pattern || !pattern.channels) return { channels: [], length: pattern?.length ?? 64 };
  const channels = [];
  for (let ci = 0; ci < pattern.channels.length; ci++) {
    const ch = pattern.channels[ci];
    if (!Array.isArray(ch)) { channels.push(null); continue; }
    const sparse = {};
    for (let ri = 0; ri < ch.length; ri++) {
      const packed = packStep(ch[ri]);
      if (packed) sparse[ri] = packed;
    }
    channels.push(Object.keys(sparse).length > 0 ? sparse : null);
  }
  while (channels.length > 0 && channels[channels.length - 1] === null) channels.pop();
  return { channels, length: pattern.length ?? 64 };
}

function emptyStep() {
  return { note: '', vol: '', fxCmd: '', fxVal: '' };
}

function createEmptyPattern(length, numChannels) {
  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    const rows = [];
    for (let r = 0; r < length; r++) rows.push(emptyStep());
    channels.push(rows);
  }
  return { channels, length };
}

function setStep(pattern, ch, row, note, vol = '80', fxCmd = '', fxVal = '') {
  const step = pattern.channels[ch][row];
  step.note = note;
  step.vol = vol || '';
  step.fxCmd = fxCmd || '';
  step.fxVal = fxVal || '';
}

// IDM: broken beats, off-grid hats, 303 lines, variation every few patterns
function fillBreakbeat(pat, length, seed) {
  const rnd = (i) => ((seed * 31 + i) * 17) % 100;
  // Kick often on 0, 8, 16, 24 (4/4) or broken
  for (let r = 0; r < length; r += 4) {
    if (rnd(r) < 75) setStep(pat, 2, r, midiToNote(KICK), 'A0');
  }
  if (length >= 32) {
    if (rnd(1) < 50) setStep(pat, 2, 12, midiToNote(KICK), '90');
    if (rnd(2) < 40) setStep(pat, 2, 20, midiToNote(KICK), '88');
  }
  // Snare on 2nd and 4th (or off)
  for (let r = 8; r < length; r += 16) {
    setStep(pat, 3, r, midiToNote(SNARE), 'A0');
    if (r + 8 < length && rnd(r + 8) < 70) setStep(pat, 3, r + 8, midiToNote(SNARE), '88');
  }
  for (let r = 4; r < length; r += 4) {
    if (rnd(r + 3) < 55) setStep(pat, 4, r, midiToNote(HIHAT), '70');
  }
  for (let r = 0; r < length; r += 16) {
    if (r + 12 < length) setStep(pat, 5, r + 12, midiToNote(OPENHAT), '60');
  }
}

function fill303Bass(pat, length, seed) {
  const notes = [28, 31, 33, 35, 36, 38, 40]; // E1, G1, A1, B1, C2, D2, E2
  const base = notes[seed % notes.length];
  for (let r = 0; r < length; r += 4) {
    const n = notes[(seed + r / 4) % notes.length];
    setStep(pat, 0, r, midiToNote(n), '90');
  }
}

function fillSynthStab(pat, length, seed) {
  const notes = [48, 50, 52, 55, 57, 60];
  for (let r = 0; r < length; r += 8) {
    if ((seed + r) % 3 !== 0) setStep(pat, 1, r, midiToNote(notes[(seed + r / 8) % notes.length]), '70');
  }
}

function buildSong(name, numPatterns, patternLength, bpm) {
  const patterns = [];
  const order = [];
  for (let i = 0; i < numPatterns; i++) {
    const pat = createEmptyPattern(patternLength, 16);
    fillBreakbeat(pat, patternLength, i * 7 + 1);
    if (i % 4 !== 2) fill303Bass(pat, patternLength, i);
    if (i % 5 === 0 || i % 7 === 3) fillSynthStab(pat, patternLength, i + 11);
    // Extra percussion on some patterns
    if (i % 6 === 0) {
      for (let r = 4; r < patternLength; r += 8) setStep(pat, 6, r, midiToNote(CLAP), '60');
    }
    if (i % 8 === 1) {
      setStep(pat, 7, 0, midiToNote(LOWTOM), '80');
      setStep(pat, 7, 8, midiToNote(MIDTOM), '70');
      setStep(pat, 7, 16, midiToNote(HITOM), '78');
    }
    patterns.push(pat);
    order.push(i);
  }
  // Song order: repeat blocks with variation
  const songOrder = [];
  for (let block = 0; block < Math.ceil(numPatterns / 8); block++) {
    const start = (block * 8) % numPatterns;
    for (let i = 0; i < 8 && start + i < numPatterns; i++) songOrder.push(start + i);
    if (block % 3 === 1 && numPatterns > 20) {
      songOrder.push((start + 4) % numPatterns);
      songOrder.push((start + 2) % numPatterns);
    }
  }
  const packedPatterns = patterns.map(packPattern);
  const trackNames = Array.from({ length: 16 }, (_, i) => ['Kick', 'Snare', 'Hat', 'OHat', 'Clap', 'Tom', '303', 'Synth', '8', '9', '10', '11', '12', '13', '14', '15'][i] || String(i + 1));
  const trackInstruments = {
    '0': '303', '1': 'saw', '2': '808', '3': '808', '4': '808', '5': '808', '6': '808', '7': '808',
    '8': 'sine', '9': 'triangle', '10': '808', '11': '909', '12': 'pad', '13': 'noise', '14': 'pluck', '15': 'square'
  };
  return {
    v: TRACKER_SONG_SCHEMA_VERSION,
    patterns: packedPatterns,
    order: songOrder.length ? songOrder : order,
    currentPattern: 0,
    channels: 16,
    patternLength,
    bpm,
    playbackMode: 'song',
    stepSize: 1,
    trackNames,
    trackDevices: [],
    trackInstruments,
    currentOctave: 4,
    mutedTracks: [],
    soloedTracks: [],
    globalFx: {
      delayTime: 0.25, delayFeedback: 0.35, reverbAmount: 0.2,
      masterVolume: 0.7
    }
  };
}

const OUT_DIR = path.join(__dirname, '..', 'idm-songs');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const songs = [
  { name: 'idm-glitch-50', patterns: 50, length: 64, bpm: 165 },
  { name: 'idm-break-52', patterns: 52, length: 64, bpm: 148 },
  { name: 'idm-drill-55', patterns: 55, length: 32, bpm: 172 }
];

for (const s of songs) {
  const content = buildSong(s.name, s.patterns, s.length, s.bpm);
  const json = JSON.stringify(content);
  const outPath = path.join(OUT_DIR, s.name + '.json');
  fs.writeFileSync(outPath, json, 'utf8');
  console.log(`Wrote ${outPath} (${s.patterns} patterns, ${(json.length / 1024).toFixed(1)} KB)`);
}

console.log('\nLoad these in noistracker3.html (File → Load or paste JSON), enter a Nostr room, and Publish to put them on Nostr.');
