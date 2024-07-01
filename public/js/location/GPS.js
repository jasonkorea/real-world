// 등록한 Listener들에게 GPS 값을 얻어올 때 마다 전달하는 singleton class. getInstance()로 객체를 얻어 사용한다.
export default class GPS {
    constructor() {
        this.listeners = [];
        this.watchID = null;
        this.lastPosition = null;
        //GPS 값이 2회 이상에서 신뢰성이 높아지기 때문에 2회인지 측정하는 변수
        this.count = 0;
    }

    // GPS 값을 받아오는데 성공하면 listener에게 전달한다.
    success = (position) => {
        this.count++;
        console.log("position", position);
        console.log("lastPosition", this.lastPosition);
        this.lastPosition = position;
        this.listeners.forEach(listener => {
            listener.onSuccess(position);
        });
    }

    // GPS 값을 받아오는데 실패하면 listener에게 전달한다.
    error = (error) => {
        this.listeners.forEach(listener => {
            listener.onError(error);
        });
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    // GPS 값을 받아오는데 성공하면 listener에게 전달한다.
    removeListener(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    // GPS 값을 받아오는데 성공하면 listener에게 전달한다.
    start() {
        if (this.watchID) {
            return;
        }
        this.watchID = navigator.geolocation.watchPosition(this.success, this.error);
    }

    // GPS 값을 받아오는데 성공하면 listener에게 전달한다.
    stop() {
        if (this.watchID) {
            navigator.geolocation.clearWatch(this.watchID);
            this.watchID = null;
        }
    }

    // GPS 값을 받아오는데 성공하면 listener에게 전달한다.
    async getLastPosition() {
        return new Promise(async (resolve, reject) => {
            while (this.lastPosition == null || this.count < 2) {
                await new Promise(resolve => {
                    setTimeout(resolve, 10);
                });
            }

            console.log("lastPosition", this.lastPosition);
            resolve(this.lastPosition);
        });
    }

    // GPS 값을 받아오는데 성공하면 listener에게 전달한다.
    static getInstance() {
        if (!GPS.instance) {
            GPS.instance = new GPS();
        }
        return GPS.instance;
    }
}