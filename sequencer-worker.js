let schedulerState = {
    running: false,
    bpm: 125,
    tickMs: 20,
    lookaheadMs: 150,
    nextStepTimeMs: 0,
    nextClockTimeMs: 0,
    timerId: null
};

function getStepIntervalMs() {
    return 60000 / schedulerState.bpm / 4;
}

function getClockIntervalMs() {
    return 60000 / schedulerState.bpm / 24;
}

function clearSchedulerTimer() {
    if (schedulerState.timerId !== null) {
        clearTimeout(schedulerState.timerId);
        schedulerState.timerId = null;
    }
}

function scheduleTick() {
    clearSchedulerTimer();
    schedulerState.timerId = setTimeout(runScheduler, schedulerState.tickMs);
}

function runScheduler() {
    if (!schedulerState.running) {
        clearSchedulerTimer();
        return;
    }

    const now = performance.now();
    const horizon = now + schedulerState.lookaheadMs;
    const events = [];

    const stepInterval = getStepIntervalMs();
    const clockInterval = getClockIntervalMs();

    while (schedulerState.nextClockTimeMs <= horizon) {
        events.push({
            kind: 'clock',
            timeMs: schedulerState.nextClockTimeMs
        });
        schedulerState.nextClockTimeMs += clockInterval;
    }

    while (schedulerState.nextStepTimeMs <= horizon) {
        events.push({
            kind: 'step',
            timeMs: schedulerState.nextStepTimeMs
        });
        schedulerState.nextStepTimeMs += stepInterval;
    }

    if (events.length > 0) {
        events.sort((a, b) => a.timeMs - b.timeMs);
        postMessage({
            type: 'schedule',
            events
        });
    }

    scheduleTick();
}

function startScheduler(payload) {
    schedulerState.bpm = payload.bpm || 125;
    schedulerState.tickMs = payload.tickMs || 20;
    schedulerState.lookaheadMs = payload.lookaheadMs || 150;

    const startTimeMs = typeof payload.startTimeMs === 'number' ? payload.startTimeMs : performance.now();
    schedulerState.nextStepTimeMs = startTimeMs + getStepIntervalMs();
    schedulerState.nextClockTimeMs = startTimeMs + getClockIntervalMs();
    schedulerState.running = true;

    runScheduler();
}

function stopScheduler() {
    schedulerState.running = false;
    clearSchedulerTimer();
}

function updateBpm(nextBpm) {
    const safeBpm = Math.max(32, Math.min(255, Number(nextBpm) || 125));
    const now = performance.now();
    const previousStepInterval = getStepIntervalMs();
    const previousClockInterval = getClockIntervalMs();

    const stepPhase = previousStepInterval > 0 ? (schedulerState.nextStepTimeMs - now) / previousStepInterval : 1;
    const clockPhase = previousClockInterval > 0 ? (schedulerState.nextClockTimeMs - now) / previousClockInterval : 1;

    schedulerState.bpm = safeBpm;

    const nextStepInterval = getStepIntervalMs();
    const nextClockInterval = getClockIntervalMs();

    schedulerState.nextStepTimeMs = now + Math.max(0, stepPhase) * nextStepInterval;
    schedulerState.nextClockTimeMs = now + Math.max(0, clockPhase) * nextClockInterval;
}

self.onmessage = (event) => {
    const payload = event.data || {};

    if (payload.type === 'start') {
        startScheduler(payload);
    } else if (payload.type === 'stop') {
        stopScheduler();
    } else if (payload.type === 'setBpm') {
        updateBpm(payload.bpm);
    }
};
