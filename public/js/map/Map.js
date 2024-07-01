//Create class controls and return google map object
import GPS from "../location/GPS.js";

export default class RealMap {
    constructor(map) {
        this.isInitialized = false;
        this.#initMap();
        this.map = map;
        this.units = new Map();
        
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
    }

    #updateLocation(position) {
        this.position = position;
    }

    getNewPosition(lat, lng, xMeter, yMeter) {
        // Earth’s radius, sphere
        const R = 6378137;

        // Coordinate offsets in radians
        const dLat = yMeter / R;
        const dLng = xMeter / (R * Math.cos(Math.PI * lat / 180));

        // OffsetPosition, decimal degrees
        const newLat = lat + dLat * 180 / Math.PI;
        const newLng = lng + dLng * 180 / Math.PI;

        return { newLat, newLng };
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
        controlUI.innerText = "현재 위치로 이동";
        controlUI.style.cursor = "pointer";
        controlUI.style.color = "white";
        controlUI.style.textAlign = "center";
    
        controlDiv.appendChild(controlUI);
    
        controlUI.addEventListener("click", () => {
            this.moveToCurrentPosition();
        });
        this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);
    }

    addUnit(unit) {
        this.units.set(unit.id, unit);
        unit.setMap(this.map);
    }

    moveToCurrentPosition() {
        if (!this.position) {
            return;
        }
        this.map.panTo({ lat: this.position.coords.latitude, lng: this.position.coords.longitude });
    }
}