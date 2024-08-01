//Create class controls and return google map object
import GPS from "../location/GPS.js";
import UnitOverlay from "../overlay/UnitOverlay.js";
import Socket from "../socket/Socket.js";
import GlobalTimer from "../anim/GameTimer.js";
import MainPanel from "../control/MainPanel.js";
import GameTimer from "../anim/GameTimer.js";

export default class RealMap {
    //['Attack', 'Move', 'Stop', 'Patrol', 'Hold Position', 'Follow', 'Gather', 'Build', 'Train'];
    #Actions = {
        ATTACK: 1,
        MOVE: 2,
        STOP: 3,
        PATROL: 4,
        HOLD_POSITION: 5,
        FOLLOW: 6,
        GATHER: 7,
        BUILD: 8,
        TRAIN: 9
    };

    #map;
    get map() {
        return this.#map;
    }

    units;
    #userId;
    instance;

    constructor(googleId) {
        (async () => {
            /* global google */
            await google.maps.importLibrary("maps");
            const map = new google.maps.Map(document.getElementById("map"), {
                zoom: 17,
                center: { lat: 37.5665, lng: 126.9780 },
                disableDoubleClickZoom: true,
                streetViewControl: false,
                zoomControl: false,
                mapTypeControl: false,
                clickableIcons: false,
                //어두운 회색 배경
                backgroundColor: "#2c5a71",
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [
                            {
                                visibility: "off",
                            },
                        ],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [
                            {
                                visibility: "simplified",
                            },
                        ],
                    },
                    {
                        featureType: "road",
                        elementType: "labels",
                        stylers: [
                            {
                                visibility: "off",
                            },
                        ],
                    },
                    {
                        featureType: "transit",
                        elementType: "labels.icon",
                        stylers: [
                            {
                                visibility: "off",
                            },
                        ],
                    },
                    {
                        featureType: "administrative",
                        elementType: "geometry",
                        stylers: [
                            {
                                visibility: "off",
                            },
                        ],
                    },
                    {
                        featureType: "landscape",
                        elementType: "geometry",
                        stylers: [
                            {
                                color: "#2c5a71",
                            },
                        ],
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [
                            {
                                color: "#193341",
                            },
                        ],
                    },
                    {
                        featureType: "landscape.natural",
                        elementType: "labels",
                        stylers: [
                            {
                                visibility: "off",
                            },
                        ],
                    },
                    {
                        featureType: "landscape.man_made",
                        elementType: "geometry",
                        stylers: [
                            {
                                color: "#334e87",
                            },
                        ],
                    },
                    {
                        featureType: "landscape.man_made",
                        elementType: "labels",
                        stylers: [
                            {
                                visibility: "off",
                            },
                        ],
                    },
                ],
            });
            this.#userId = googleId;
            this.isInitialized = false;
            this.#initMap();
            this.#map = map;
            this.units = new Map();
            this.UnitOverlay = UnitOverlay();
            RealMap.instance = this;
            this.toggleUnitDisplayBasedOnZoom();
        })();

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
        controlUI.addEventListener("click", () => {
            //this.moveToCurrentPosition();
            this.moveCameraToUnit(this.#userId);
        });

        // 현재 위치로 이동 버튼
        const moveToCurrentLocationUI = document.createElement("div");
        moveToCurrentLocationUI.id = "move-to-current-location";
        moveToCurrentLocationUI.innerText = "현재 위치로 이동";
        moveToCurrentLocationUI.style.cursor = "pointer";
        moveToCurrentLocationUI.style.color = "white";
        moveToCurrentLocationUI.style.textAlign = "center";
        moveToCurrentLocationUI.style.borderBottom = "1px solid white";
        moveToCurrentLocationUI.addEventListener("click", () => {
            this.moveToCurrentPosition();
        });

        // 팝업 테스트 버튼
        const showPopupUI = document.createElement("div");
        showPopupUI.id = "show-popup";
        showPopupUI.innerText = "팝업 윈도우 테스트";
        showPopupUI.style.cursor = "pointer";
        showPopupUI.style.color = "white";
        showPopupUI.style.textAlign = "center";
        showPopupUI.addEventListener("click", () => {
            const overlay = document.createElement('div');
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    document.getElementById('map').removeChild(overlay);
                }
            });

            overlay.className = 'overlay'
            const popup = document.createElement('div');
            popup.classList.add('popup');
            popup.addEventListener('click', (event) => {
                event.stopPropagation(); // 팝업 내부 클릭 시 이벤트 전파 중단
            });

            const btnGame = document.createElement('div');
            btnGame.classList.add('btn-game');

            const buttons = ['Attack', 'Move', 'Stop', 'Patrol', 'Hold Position', 'Follow', 'Gather', 'Build', 'Train'];
            for (let i = 1; i <= 9; i++) {
                const button = document.createElement('button');
                button.textContent = buttons[i - 1];
                button.addEventListener('click', () => {
                    this.currentAction = i;

                    this.#handleEventFromPopupWindow();
                    let toastLiveExample = document.getElementById('liveToast');

                    // 기존 토스트 인스턴스 제거
                    if (toastLiveExample.toastInstance) {
                        toastLiveExample.toastInstance.dispose();
                    }

                    // eslint-disable-next-line no-undef
                    const toastBootstrap = new bootstrap.Toast(toastLiveExample, { delay: 2000 });
                    toastLiveExample.toastInstance = toastBootstrap;
                    //set message from action
                    toastLiveExample.querySelector('.toast-body').innerText = buttons[i - 1];
                    toastBootstrap.show();

                    document.getElementById('map').removeChild(overlay);
                });

                btnGame.appendChild(button);
            }

            const cancelButton = document.createElement('button');
            cancelButton.textContent = '취소';
            cancelButton.className = 'btn btn-danger';
            cancelButton.style.marginTop = '10px';
            cancelButton.addEventListener('click', () => {
                document.getElementById('map').removeChild(overlay);
            });

            popup.appendChild(btnGame);
            popup.appendChild(cancelButton);
            overlay.appendChild(popup);
            document.getElementById('map').appendChild(overlay);
        });

        controlDiv.appendChild(controlUI);
        controlDiv.appendChild(moveToCurrentLocationUI);
        controlDiv.appendChild(showPopupUI);


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
        if (this.units.get(id)) {
            this.map.panTo(await this.units.get(id).getCurrentCenter());
            this.map.setZoom(16);
        } else {
            console.log("해당 유닛이 없습니다.");
        }
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
        const image = unitInfo.image;

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

    async #handleEventFromPopupWindow() {
        if (this.currentAction) {
            console.log("currentAction : ", this.currentAction);
            if (this.currentAction === this.#Actions.STOP) {
                console.log("STOP");
        
            }
        }
    }

    static getInstance() {
        if (!RealMap.instance) {
            RealMap.instance = new RealMap();
        }
        return RealMap.instance;
    }
}