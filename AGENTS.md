# Agent Notes

## Schism Tracker as Reference Implementation

When working on IT (Impulse Tracker) file format features — sample decompression, pattern parsing, effect handling, playback engine, instrument envelopes, etc. — **always check the Schism Tracker source code** as the authoritative reference:

- **Repository**: https://github.com/schismtracker/schismtracker
- **Key source files**:
  - `fmt/compression.c` — IT214/IT215 sample decompression (`it_decompress8`, `it_decompress16`). This is the definitive implementation with correct border calculations, width expansion logic, and sign extension.
  - `fmt/it.c` — IT file loading, header parsing, pattern unpacking
  - `include/sndfile.h` — Data structures for samples, instruments, patterns
  - `player/` — Playback engine, effect processing, mixing

### Known pitfalls (learned the hard way)

1. **IT sample decompression border calculation**: The border for method 2 (width 7-16 for 16-bit, 7-8 for 8-bit) must be computed as `(0xFFFF >> (17 - width)) - 8` (16-bit) or `(0xFF >> (9 - width)) - 4` (8-bit). Using `(1 << (width-1)) - 8` is off by one and corrupts samples.

2. **Width expansion on change**: When changing bit width, Schism uses `(newWidth < currentWidth) ? newWidth : newWidth + 1`. This skips the current width value when going up. Simply using `newWidth` directly is wrong.

3. **Sign extension**: Schism uses C's arithmetic right shift on signed types: `v = (int16_t)((value << shift) >> shift)`. In JavaScript, replicate with: `v = (value << (16 - width)) << 16 >> 16 >> (16 - width)`.

4. **IT header offsets**: OrdNum at 0x20, InsNum at 0x22, SmpNum at 0x24, PatNum at 0x26. Sample header (IMPS): length at 0x30, loopStart at 0x34, loopEnd at 0x38, c5speed at 0x3C, dataOff at 0x48. Pattern header: packLen is uint16 at offset 0, rows is uint16 at offset 2, data starts at offset 8.
