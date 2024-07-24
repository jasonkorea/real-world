//Create class controls and return google map object
import GPS from "../location/GPS.js";
import UnitOverlay from "../overlay/UnitOverlay.js";
import Socket from "../socket/Socket.js";
import GlobalTimer from "../anim/GameTimer.js";
import MainPanel from "../control/MainPanel.js";
import GameTimer from "../anim/GameTimer.js";

export default class RealMap {
    #map;
    get map() {
        return this.#map;
    }

    units;
    #userId;
    instance;

    constructor(map, googleId) {
        this.#userId = googleId;
        this.isInitialized = false;
        this.#initMap();
        this.#map = map;
        this.units = new Map();
        this.UnitOverlay = UnitOverlay();
        RealMap.instance = this;
        this.toggleUnitDisplayBasedOnZoom();
    }

    async #initMap() {
        console.log('initMap');
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        this.#addGPSListener();


        while (!this.position) {
            await new Promise(resolve => {
                console.log("waiting for position...");
                setTimeout(resolve, 500);
            });
        }

        //const marker = await this.#createMarker();
        //marker.setMap(this.map);
        Socket.getInstance().sendMessage({
            sender: -1,
            type: 'move',
            unitInfo: {
                startPosition: { lat: this.position.coords.latitude, lng: this.position.coords.longitude },
                destinationPosition: { lat: this.position.coords.latitude, lng: this.position.coords.longitude },
                size: 20,
                speed: 10,
                image: '../resources/cc.png',
                userName: '기지'
            }
        });

        // 사실 위 코드는 임시로 넣은 것이다. 실제로는 서버에서 받은 정보를 이용하여 unit을 생성해야 한다.
        // 다음의 코드도 사실 임시 코드이고, 서버는 unique한 id를 생성해야 한다.
        /*
        const centerIdFromUserId = this.#userId / 2;
        Socket.getInstance().sendMessage({
            "type": "move",
            "sender":centerIdFromUserId,
            "unitInfo": {
                "startPosition": this.position.coords.latitud,
                "destinationPosition": this.position.coords.longitude,
                "image": '../resources/cc.png',
                "size": 20,
                "speed": 10,
                "userName": '기지'
            }
        });
        */


        this._addControl();

        this.#map.addListener('click', async (event) => {
            console.log('clicked!', event.latLng.toJSON());
            //MainPanel.getInstance().addChat({sender: "Map(Click)", message: `${event.latLng.toJSON().lat}, ${event.latLng.toJSON().lng}`});


            let unit = this.units.get(this.#userId);
            let center;
            if (!unit) {
                console.log("unit이 없어서 생성. 단지 생성 요청하는 용도");
            } else {
                center = await unit.getCurrentCenter();
                console.log("unit이 있어서 이동. 현재 위치 : ", center.lat(), center.lng());
                //MainPanel.getInstance().addChat({sender: "Map(current)", message: `${center.lat()}, ${center.lng()}`});
            }
            const startPosition = unit ? { lat: center.lat(), lng: center.lng() } : event.latLng.toJSON();
            console.log(startPosition);
            Socket.getInstance().sendMessage({
                "type": "move",
                "sender": this.#userId,
                "unitInfo": {
                    "startPosition": !unit ? event.latLng.toJSON() : startPosition,
                    "destinationPosition": event.latLng.toJSON(),
                    "image": "../resources/airplane.png",
                    "size": 100,
                    "speed": 400,
                }
            });
        });

        this.#map.addListener('dblclick', async (event) => {
            console.log('dblclicked!', event.latLng.toJSON());
            MainPanel.getInstance().addChat({ sender: "Map(DblClick)", message: `${event.latLng.toJSON().lat}, ${event.latLng.toJSON().lng}` });
        });
    }

    getCurrentUTCTimeMillis() {
        const now = new Date(); // 현재 시간
        const utcMillis = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
            now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
        return utcMillis;
    }

    #updateLocation(position) {
        this.position = position;
    }

    // eslint-disable-next-line no-unused-private-class-members
    async #createMarker() {
        /* global google */
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        const img = document.createElement("img");
        //img.src = "https://projectj.tplinkdns.com/resources/cc.png";
        img.src = "https://projectj.tplinkdns.com/resources/small_cc.png";

        // The marker, positioned at Uluru
        return new AdvancedMarkerElement({
            position: { lat: this.position.coords.latitude, lng: this.position.coords.longitude },
            map: this.map,
            content: img,
            title: "Here!",
        });
    }


    #addGPSListener() {
        GPS.getInstance().addListener({
            onSuccess: (position) => {
                this.#updateLocation(position);
            },
            onError: (error) => {
                console.error(error);
            }
        });
    }

    //지도의 우상단에 현재 위치 정보와 현재 위치로 이동하는 버튼을 추가한다.
    _addControl() {
        if (!this.map || !this.map.controls) {
            return;
        }

        const controlDiv = document.createElement("div");
        controlDiv.className = "btn btn-primary";
        controlDiv.style.margin = "10px";
        controlDiv.style.padding = "10px";

        const controlUI = document.createElement("div");
        controlUI.id = "current-location";
        controlUI.innerText = "내 유닛으로 이동";
        controlUI.style.cursor = "pointer";
        controlUI.style.color = "white";
        controlUI.style.textAlign = "center";
        controlUI.style.borderBottom = "1px solid white";

        // 현재 위치로 이동 버튼
        const moveToCurrentLocationUI = document.createElement("div");
        moveToCurrentLocationUI.id = "move-to-current-location";
        moveToCurrentLocationUI.innerText = "현재 위치로 이동";
        moveToCurrentLocationUI.style.cursor = "pointer";
        moveToCurrentLocationUI.style.color = "white";
        moveToCurrentLocationUI.style.textAlign = "center";
        moveToCurrentLocationUI.addEventListener("click", () => {
            this.moveToCurrentPosition();
        });

        controlDiv.appendChild(controlUI);
        controlDiv.appendChild(moveToCurrentLocationUI);

        controlUI.addEventListener("click", () => {
            //this.moveToCurrentPosition();
            this.moveCameraToUnit(this.#userId);
        });
        this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);
    }

    #addUnit(unitInfo) {
        console.log("startPosition lat lng = ", unitInfo.startPosition.lat, unitInfo.startPosition.lng);
        console.log("destinationPosition lat lng = ", unitInfo.destinationPosition.lat, unitInfo.destinationPosition.lng);
        console.log("----------------- unitInfo : ", unitInfo);

        unitInfo.isMe = unitInfo.googleId === this.#userId;
        if (unitInfo.isMe) unitInfo.zIndex = 1; else unitInfo.zIndex = 0;
        const unit = new this.UnitOverlay(unitInfo);
        this.units.set(unit.id, unit);
        unit.setMap(this.map);
        unit.move(unitInfo.startPosition, unitInfo.destinationPosition, unitInfo.startTime, true);

        // 애니메이션 루프에 추가
        GameTimer.getInstance().addOverlay(unit);
        return unit;
    }

    getUnits() {
        return this.units;
    }

    moveToCurrentPosition() {
        if (!this.position) {
            return;
        }
        this.map.panTo({ lat: this.position.coords.latitude, lng: this.position.coords.longitude });
        this.map.setZoom(16);
    }

    async moveCameraToUnit(id) {
        console.log(this.units.get(id));
        this.map.panTo(await this.units.get(id).getCurrentCenter());
        this.map.setZoom(16);
    }

    #moveUnit(message) {
        const unit = this.units.get(message.sender);
        console.log(unit);
        console.log('move unit startTime : ', message.unitInfo.startTime);
        //print now
        console.log('현재 시간 :', GlobalTimer.getInstance().getServerTime());
        if (unit) {
            unit.startTime = message.unitInfo.startTime;
            unit.startPosition = message.unitInfo.startPosition;
            unit.destinationPosition = message.unitInfo.destinationPosition;
            unit.size = message.unitInfo.size;
            unit.speed = message.unitInfo.speed;
            unit.image = message.unitInfo.image;
            unit.isMe = message.sender === this.#userId;
            unit.move(message.unitInfo.startPosition, message.unitInfo.destinationPosition, message.unitInfo.startTime, true);
        }
    }

    toggleUnitDisplayBasedOnZoom() {
        const zoomThreshold = 15; // 줌 레벨 임계값, 이 값은 조정 가능
        this.map.addListener('zoom_changed', () => {
            const currentZoom = this.map.getZoom();
            if (currentZoom < zoomThreshold) {
                // 줌 레벨이 임계값 아래일 때
                this.units.forEach(unit => {
                    unit.showMarker();
                    unit.hideOverlay();
                });
            } else {
                // 줌 레벨이 임계값 이상일 때
                this.units.forEach(unit => {
                    unit.hideMarker();
                    unit.showOverlay();
                });
            }
        });
    }

    moveOrAddUnit(message) {
        const unit = this.units.get(message.sender);
        if (unit) {
            console.log("unit 있음", message);
            this.#moveUnit(message);
        } else {
            console.log("unit 없음", message);
            const unitInfo = this.#getUnitInfoFromMessage(message);
            this.#addUnit(unitInfo);
            console.log("unit 추가 됨", unit);
        }
    }

    #getUnitInfoFromMessage(message) {
        const { sender: googleId, unitInfo } = message;
        const { startPosition, destinationPosition, size, speed, startTime, userName } = unitInfo;
        const image = '../resources/airplane.png';

        return {
            googleId,
            startPosition: { lat: startPosition.lat, lng: startPosition.lng },
            destinationPosition: { lat: destinationPosition.lat, lng: destinationPosition.lng },
            size,
            speed,
            image,
            startTime,
            userName
        };
    }

    static getInstance() {
        if (!RealMap.instance) {
            RealMap.instance = new RealMap();
        }
        return RealMap.instance;
    }
}