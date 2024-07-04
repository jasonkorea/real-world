import UnitOverlay from "../overlay/UnitOverlay.js";

export default class GameTimer {

    overays = [];
    instance;

    constructor() {
        console.log('GameTimer constructor');
        if (GameTimer.instance) {
            return GameTimer.instance;
        }

        this.worker = new Worker('https://projectj.tplinkdns.com/js/anim/timerWorker.js');
        this.worker.onmessage = this._handleMessage.bind(this);

        GameTimer.instance = this;
    }

    _handleMessage(event) {
        if (event.data.type === 'tick') {
            this.update(event.data.deltaTime);
        } else if (event.data.type === 'progress') {

        }
    }

    start() {
        console.log('GameTimer start');
        this.worker.postMessage('start');
    }

    stop() {
        this.worker.postMessage('stop');
    }

    setInterval(interval) {
        this.worker.postMessage({ type: 'setInterval', value: interval });
    }

    update(deltaTime) {
        this.overays.forEach(overlay => {
            overlay.updateBounds();
        });
        //console.log(`Timer tick - deltaTime: ${deltaTime} ms`);
    }

    addOverlay(overlay) {
        this.overays.push(overlay);
    }

    removeOverlay(overlay) {
        const index = this.overays.indexOf(overlay);
        if (index > -1) {
            this.overays.splice(index, 1);
        }
    }

    static getInstance() {
        if (!GameTimer.instance) {
            GameTimer.instance = new GameTimer();
        }
        return GameTimer.instance;
    }
}