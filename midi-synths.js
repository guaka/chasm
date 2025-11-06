/**
 * MIDI Synth Abstraction Library
 * 
 * Provides object-oriented abstractions for hardware MIDI synths and samplers,
 * making it easy to plug them into generative MIDI projects.
 */

/**
 * MIDI Manager - Handles Web MIDI API access and device management
 */
class MidiManager {
    constructor() {
        this.midiAccess = null;
        this.midiOutput = null;
        this.devices = [];
        this.onStateChange = null;
    }

    /**
     * Initialize MIDI access and enumerate devices
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async initialize() {
        try {
            if (!navigator.requestMIDIAccess) {
                throw new Error('Web MIDI API not supported');
            }
            this.midiAccess = await navigator.requestMIDIAccess();
            this.updateDeviceList();
            this.midiAccess.onstatechange = () => {
                this.updateDeviceList();
                if (this.onStateChange) {
                    this.onStateChange();
                }
            };
            return true;
        } catch (error) {
            console.error('MIDI access denied:', error);
            return false;
        }
    }

    /**
     * Update the internal device list
     */
    updateDeviceList() {
        if (this.midiAccess) {
            this.devices = Array.from(this.midiAccess.outputs.values());
        } else {
            this.devices = [];
        }
    }

    /**
     * Get list of available MIDI devices
     * @returns {Array} Array of MIDIOutput objects
     */
    getDevices() {
        return this.devices;
    }

    /**
     * Connect to a MIDI device by index
     * @param {number} deviceIndex - Index of device in devices array
     * @returns {boolean} True if successful, false otherwise
     */
    connect(deviceIndex) {
        if (!this.midiAccess) {
            return false;
        }

        if (deviceIndex >= 0 && deviceIndex < this.devices.length) {
            this.midiOutput = this.devices[deviceIndex];
            return true;
        }
        return false;
    }

    /**
     * Disconnect from current MIDI device
     */
    disconnect() {
        this.midiOutput = null;
    }

    /**
     * Check if connected to a device
     * @returns {boolean}
     */
    isConnected() {
        return this.midiOutput !== null;
    }

    /**
     * Get the name of the connected device
     * @returns {string|null}
     */
    getConnectedDeviceName() {
        return this.midiOutput ? this.midiOutput.name : null;
    }
}

/**
 * Base Synth Class - Abstract base class with common MIDI operations
 */
class BaseSynth {
    /**
     * @param {MIDIOutput} midiOutput - MIDI output port
     * @param {number} channel - MIDI channel (1-16, default: 1)
     */
    constructor(midiOutput, channel = 1) {
        this.midiOutput = midiOutput;
        this.channel = Math.max(1, Math.min(16, channel)) - 1; // Convert to 0-15 for MIDI
    }

    /**
     * Send a MIDI note on message
     * @param {number} note - MIDI note number (0-127)
     * @param {number} velocity - Note velocity (0-127)
     */
    noteOn(note, velocity) {
        if (!this.midiOutput) return;
        const clampedNote = Math.max(0, Math.min(127, Math.floor(note)));
        const clampedVelocity = Math.max(0, Math.min(127, Math.floor(velocity)));
        this.midiOutput.send([0x90 + this.channel, clampedNote, clampedVelocity]);
    }

    /**
     * Send a MIDI note off message
     * @param {number} note - MIDI note number (0-127)
     * @param {number} velocity - Release velocity (0-127, default: 0)
     */
    noteOff(note, velocity = 0) {
        if (!this.midiOutput) return;
        const clampedNote = Math.max(0, Math.min(127, Math.floor(note)));
        const clampedVelocity = Math.max(0, Math.min(127, Math.floor(velocity)));
        this.midiOutput.send([0x80 + this.channel, clampedNote, clampedVelocity]);
    }

    /**
     * Play a note with automatic note off after duration
     * @param {number} note - MIDI note number (0-127)
     * @param {number} velocity - Note velocity (0-127)
     * @param {number} duration - Duration in milliseconds
     */
    playNote(note, velocity, duration) {
        if (!this.midiOutput) return;
        this.noteOn(note, velocity);
        setTimeout(() => {
            if (this.midiOutput) {
                this.noteOff(note, 0);
            }
        }, duration);
    }

    /**
     * Send a Control Change (CC) message
     * @param {number} controller - CC number (0-127)
     * @param {number} value - CC value (0-127)
     */
    sendCC(controller, value) {
        if (!this.midiOutput) return;
        const clampedController = Math.max(0, Math.min(127, Math.floor(controller)));
        const clampedValue = Math.max(0, Math.min(127, Math.floor(value)));
        this.midiOutput.send([0xB0 + this.channel, clampedController, clampedValue]);
    }

    /**
     * Send a Program Change message
     * @param {number} program - Program number (0-127)
     */
    sendProgramChange(program) {
        if (!this.midiOutput) return;
        const clampedProgram = Math.max(0, Math.min(127, Math.floor(program)));
        this.midiOutput.send([0xC0 + this.channel, clampedProgram]);
    }

    /**
     * Send a Pitch Bend message
     * @param {number} value - Pitch bend value (-8192 to 8191, 0 = center)
     */
    sendPitchBend(value) {
        if (!this.midiOutput) return;
        // Convert to 14-bit value (0-16383, center at 8192)
        const center = 8192;
        const clampedValue = Math.max(-8192, Math.min(8191, Math.floor(value))) + center;
        const lsb = clampedValue & 0x7F;
        const msb = (clampedValue >> 7) & 0x7F;
        this.midiOutput.send([0xE0 + this.channel, lsb, msb]);
    }

    /**
     * Send raw MIDI message
     * @param {Array<number>} data - MIDI message bytes
     */
    sendRawMIDI(data) {
        if (!this.midiOutput) return;
        this.midiOutput.send(data);
    }
}

/**
 * Roland SH-4d Synthesizer
 * Default MIDI channel: 1
 */
class SH4d extends BaseSynth {
    constructor(midiOutput, channel = 1) {
        super(midiOutput, channel);
    }

    // SH-4d specific CC mappings can be added here
    // CC1: Modulation
    // CC7: Volume
    // CC11: Expression
    // CC71: Resonance
    // CC74: Cutoff
}

/**
 * Roland TR-8S Drum Machine
 * Default MIDI channel: 10 (standard drum channel)
 */
class TR8S extends BaseSynth {
    constructor(midiOutput, channel = 10) {
        super(midiOutput, channel);
    }

    // TR-8S specific methods can be added here
    // CC1: Modulation
    // CC7: Volume
    // CC11: Expression
}

/**
 * Roland TT-303 Bass Synthesizer
 * Default MIDI channel: 1
 */
class TT303 extends BaseSynth {
    constructor(midiOutput, channel = 1) {
        super(midiOutput, channel);
    }

    // TT-303 specific methods can be added here
    // CC1: Modulation
    // CC7: Volume
    // CC11: Expression
}

/**
 * Roland SP-404 MK2 Sampler
 * Default MIDI channel: 1
 */
class SP404MK2 extends BaseSynth {
    constructor(midiOutput, channel = 1) {
        super(midiOutput, channel);
    }

    // SP-404 MK2 specific methods can be added here
    // CC1: Modulation
    // CC7: Volume
    // CC11: Expression
}

/**
 * Behringer TD-3 Analog Bass Synthesizer
 * Default MIDI channel: 1
 */
class BehringerTD3 extends BaseSynth {
    constructor(midiOutput, channel = 1) {
        super(midiOutput, channel);
    }

    // TD-3 specific methods can be added here
    // CC1: Modulation
    // CC7: Volume
    // CC11: Expression
}

/**
 * Behringer RD-6 Drum Machine
 * Default MIDI channel: 10 (standard drum channel)
 */
class RD6 extends BaseSynth {
    constructor(midiOutput, channel = 10) {
        super(midiOutput, channel);
    }

    // RD-6 specific methods can be added here
}

/**
 * Behringer RD-8 Drum Machine
 * Default MIDI channel: 10 (standard drum channel)
 */
class RD8 extends BaseSynth {
    constructor(midiOutput, channel = 10) {
        super(midiOutput, channel);
    }

    // RD-8 specific methods can be added here
}

/**
 * Behringer RD-9 Drum Machine
 * Default MIDI channel: 10 (standard drum channel)
 */
class RD9 extends BaseSynth {
    constructor(midiOutput, channel = 10) {
        super(midiOutput, channel);
    }

    // RD-9 specific methods can be added here
}

/**
 * Korg Minilogue XD Synthesizer
 * Default MIDI channel: 1
 */
class KorgMinilogueXD extends BaseSynth {
    constructor(midiOutput, channel = 1) {
        super(midiOutput, channel);
    }

    // Minilogue XD specific CC mappings can be added here
    // CC1: Modulation
    // CC7: Volume
    // CC11: Expression
    // CC71: Resonance
    // CC74: Cutoff
}

/**
 * Boss RC-600 Loop Station
 * Default MIDI channel: 1
 */
class BossRC600 extends BaseSynth {
    constructor(midiOutput, channel = 1) {
        super(midiOutput, channel);
    }

    // RC-600 specific methods can be added here
    // CC1: Modulation
    // CC7: Volume
    // CC11: Expression
}

