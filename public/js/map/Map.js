//Create class controls and return google map object
import GPS from "../location/GPS.js";
import UnitOverlay from "../overlay/UnitOverlay.js";
import Socket from "../socket/Socket.js";
import GlobalTimer from "../anim/GameTimer.js";

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
        this.UnitOveray = UnitOverlay();
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
                setTimeout(resolve, 1000);
            });
        }

        const marker = await this.#createMarker();
        marker.setMap(this.map);


        this._addControl();

        this.#map.addListener('click', async (event) => {
            console.log('clicked!', event);

            let unit = this.units.get(this.#userId);
            let center;
            let isNew = !unit;
            if (!unit) {
                isNew = true;
                console.log("unit이 없어서 생성. 단지 생성 요청하는 용도");
            } else {
                center = await unit.getCurrentCenter();
                console.log("unit이 있어서 이동. 현재 위치 : ", center);
            }
            const startPosition = unit ? { lat: center.lat(), lng: center.lng() } : event.latLng.toJSON();
            console.log(startPosition);
            Socket.getInstance().sendMessage({
                "type": "move",
                "sender": this.#userId,
                "unitInfo": {
                    "startPosition": isNew ? event.latLng.toJSON() : startPosition,
                    "destinationPosition": event.latLng.toJSON(),
                    "image": "../resources/airplane.png",
                    "size": 100,
                    "speed": 100,
                }
            });

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

    async #createMarker() {
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        // The marker, positioned at Uluru
        return new AdvancedMarkerElement({
            position: { lat: this.position.coords.latitude, lng: this.position.coords.longitude },
            map: this.map,
            title: "Here!"
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

        controlDiv.appendChild(controlUI);

        controlUI.addEventListener("click", () => {
            //this.moveToCurrentPosition();
            this.moveCameraToUnit(this.#userId);
        });
        this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);
    }

    addUnit(unitInfo) {
        console.log("----------------- unit.id : ", unitInfo.googleId);
        const unit = new this.UnitOveray(unitInfo);
        this.units.set(unit.id, unit);
        unit.setMap(this.map);
        unit.move(unitInfo.startPosition, unitInfo.destinationPosition, unitInfo.startTime);
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
    }

    async moveCameraToUnit(id) {
        console.log(this.units.get(id));
        this.map.panTo(await this.units.get(id).getCurrentCenter());
        this.map.setZoom(16);
    }

    moveUnit(message) {
        const unit = this.units.get(message.sender);
        console.log(unit);
        console.log('move unit startTime : ', message.unitInfo.startTime);
        //print now
        console.log('현재 시간 :', GlobalTimer.getInstance().getServerTime());
        if (unit) {
            unit.move(message.unitInfo.startPosition, message.unitInfo.destinationPosition, message.unitInfo.startTime);
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
                });
            } else {
                // 줌 레벨이 임계값 이상일 때
                this.units.forEach(unit => {
                    unit.hideMarker();
                });
            }
        });
    }

    static getInstance() {
        if (!RealMap.instance) {
            RealMap.instance = new RealMap();
        }
        return RealMap.instance;
    }
}