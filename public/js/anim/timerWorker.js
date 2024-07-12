let startTime = null;
let lastFrameTime = null;
let interval = 1000 / 60; // 60fps
let accumulatedTime = 0;
let running = false;

function startTimer() {
    console.log('Timer started');
    startTime = performance.now();
    lastFrameTime = startTime;
    accumulatedTime = 0;
    running = true;
    tick();
}

function stopTimer() {
    running = false;
}

function tick() {
    if (!running) return;

    const now = performance.now();
    const deltaTime = now - lastFrameTime;
    accumulatedTime += deltaTime;

    while (accumulatedTime >= interval) {
        self.postMessage({ type: 'tick', deltaTime: interval });
        accumulatedTime -= interval;
    }

    lastFrameTime = now;
    self.postMessage({ type: 'progress', time: now });

    setTimeout(tick, interval); // setTimeout으로 메인 스레드 차단 최소화
}

self.onmessage = function (event) {
    console.log('Worker received:', event.data);
    if (event.data === 'start') {
        startTimer();
    } else if (event.data === 'stop') {
        stopTimer();
    } else if (event.data.type === 'setInterval') {
        interval = event.data.value;
    }
};
