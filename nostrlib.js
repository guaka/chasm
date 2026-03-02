/**
 * nostrlib.js — shared Nostr config and relay-safe subscription helpers for noistracker.
 * Use minimal filters (kinds + limit only) and filter by tags client-side to avoid
 * "could not parse command" from relays that reject #t / #r tag filters.
 */

(function (global) {
  const NOISTRACKER_RELAY = 'wss://relay.nomadwiki.org';
  const NOISTRACKER_TAG = 'noistracker';

  const NOSTR_TRACKER_KIND_SOUND_PACK = 31900;
  const NOSTR_TRACKER_KIND_TRACK_SETTINGS = 31901;
  const NOSTR_TRACKER_KIND_SONG = 30303;
  const NOSTR_TRACKER_KIND_DELTA = 30304;

  const TRACKER_KINDS = [NOSTR_TRACKER_KIND_SOUND_PACK, NOSTR_TRACKER_KIND_TRACK_SETTINGS, NOSTR_TRACKER_KIND_SONG, NOSTR_TRACKER_KIND_DELTA];

  /** Some relays (e.g. 256KB) reject larger messages. Keep event content under this. */
  const RELAY_MAX_MESSAGE_BYTES = 262144;

  /**
   * Minimal subscription filters that avoid relay "could not parse command".
   * Uses only kinds + limit (no #t, #r). Filter by tags in the onevent handler.
   * Returns one filter per kind so strict relays that choke on multiple kinds get a single-kind filter each.
   */
  function minimalFiltersTracker(opts) {
    const limit = (opts && opts.limit) || 100;
    const kinds = (opts && opts.kinds) || TRACKER_KINDS;
    return kinds.map(k => ({ kinds: [k], limit }));
  }

  /**
   * One filter per kind (song, then delta). Use with two separate subscribe() calls so each REQ has a single kind; some relays reject multi-kind or multi-filter REQs.
   */
  function minimalFiltersRoom(limit) {
    const L = limit || 100;
    return [
      { kinds: [NOSTR_TRACKER_KIND_SONG], limit: L },
      { kinds: [NOSTR_TRACKER_KIND_DELTA], limit: L }
    ];
  }

  /** Single filter for one kind (for one REQ). */
  function filterForKind(kind, limit) {
    return [{ kinds: [kind], limit: limit || 100 }];
  }

  /**
   * Get first tag value for key. ev.tags is array of [key, value, ...].
   */
  function eventTag(ev, key) {
    const t = (ev.tags || []).find(x => x[0] === key);
    return t ? t[1] : null;
  }

  /**
   * True if event has tag key with value.
   */
  function eventHasTag(ev, key, value) {
    return (ev.tags || []).some(t => t[0] === key && t[1] === value);
  }

  /**
   * All tag values for key (e.g. all "r" room ids).
   */
  function eventTagValues(ev, key) {
    return (ev.tags || []).filter(t => t[0] === key && t[1]).map(t => t[1]);
  }

  /**
   * Subscribe with multiple filters (one REQ per filter). Pass each filter as a single object —
   * relays reject "could not parse command" when the filter is sent as an array.
   * @param {Object} pool - nostr-tools SimplePool
   * @param {string[]} relays - relay URLs
   * @param {Object[]} filters - array of filter objects (each { kinds, limit })
   * @param {{ onevent: Function, eose?: Function }} opts - callbacks
   * @returns {Array} subscription handles (call .unsub() on each or use unsubMany)
   */
  function subscribeMany(pool, relays, filters, opts) {
    if (!pool || !Array.isArray(filters)) return [];
    return filters.map((filter) => pool.subscribe(relays, filter, opts));
  }

  /**
   * Unsubscribe all handles returned by subscribeMany.
   */
  function unsubMany(handles) {
    if (!Array.isArray(handles)) return;
    handles.forEach((h) => { try { if (h && h.unsub) h.unsub(); } catch (_) {} });
  }

  global.NostrLib = {
    NOISTRACKER_RELAY,
    NOISTRACKER_TAG,
    NOSTR_TRACKER_KIND_SOUND_PACK,
    NOSTR_TRACKER_KIND_TRACK_SETTINGS,
    NOSTR_TRACKER_KIND_SONG,
    NOSTR_TRACKER_KIND_DELTA,
    TRACKER_KINDS,
    RELAY_MAX_MESSAGE_BYTES,
    minimalFiltersTracker,
    minimalFiltersRoom,
    filterForKind,
    eventTag,
    eventHasTag,
    eventTagValues,
    subscribeMany,
    unsubMany
  };
})(typeof window !== 'undefined' ? window : this);
