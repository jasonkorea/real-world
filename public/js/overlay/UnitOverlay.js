import GlobalTimer from "../anim/GameTimer.js";

export default function createUnitOverlayClass() {
    return class UnitOverlay extends google.maps.OverlayView {
        #bounds;
        #id;
        #startPosition;
        #destinationPosition;
        #startTime;
        #moving = true;
        #speed;
        #size;
        degree;

        constructor(info) {
            super();
            this.degree = 0;
            this.#id = info.googleId;
            this.#size = info.size;
            this.#speed = info.speed;
            this.image = info.image;
            this.#startPosition = new google.maps.LatLng(info.startPosition.lat, info.startPosition.lng);
            this.#destinationPosition = new google.maps.LatLng(info.destinationPosition.lat, info.destinationPosition.lng);
            this.calculatedSpeed = info.speed * 1000 / 3600;
            this.#startTime = info.startTime ||  GlobalTimer.getInstance().getServerTime();
            if (info.startTime) {
                console.log("infoi.startTime exists!!!", info.startTime);
            } else {
                console.log("infoi.startTime does not exist!!!", info.startTime);
            }
            this.#setBounds(this.#startPosition.lat(), this.#startPosition.lng(), this.#size);
        }

        #setBounds(lat, lng, size) {
            const sw = this.#getNewPosition(lat, lng, -size / 2, -size / 2);
            const ne = this.#getNewPosition(lat, lng, size / 2, size / 2);

            this.#bounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(sw.newLat, sw.newLng),
                new google.maps.LatLng(ne.newLat, ne.newLng)
            );
        }

        #getNewPosition(lat, lng, xMeter, yMeter) {
            const R = 6378137; // Earth’s radius, sphere
            const dLat = yMeter / R; // Coordinate offsets in radians
            const dLng = xMeter / (R * Math.cos(Math.PI * lat / 180)); // OffsetPosition, decimal degrees
            const newLat = lat + dLat * 180 / Math.PI;
            const newLng = lng + dLng * 180 / Math.PI;
            return { newLat, newLng };
        }

        get id() {
            return this.#id;
        }

        set id(value) {
            this.#id = value;
        }

        get lat() {
            return this.#bounds.getCenter().lat();
        }

        get lng() {
            return this.#bounds.getCenter().lng();
        }

        get startPosition() {
            return this.#startPosition;
        }

        get startTime() {
            return this.#startTime;
        }

        get speed() {
            return this.#speed;
        }

        get size() {
            return this.#size;
        }

        onAdd() {
            this.div = document.createElement("div");
            this.div.style.borderStyle = "none";
            this.div.style.borderWidth = "0px";
            this.div.style.position = "absolute";
            const img = new Image();
            img.onload = () => {
                this.div.append(img);
            };
            img.src = this.image;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.position = "absolute";
            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this.div);
        }

        draw() {
            if (!this.#bounds || !this.getProjection()) return;
            const overlayProjection = this.getProjection();
            const sw = overlayProjection.fromLatLngToDivPixel(this.#bounds.getSouthWest());
            const ne = overlayProjection.fromLatLngToDivPixel(this.#bounds.getNorthEast());
            if (this.div) {
                this.div.style.left = `${sw.x}px`;
                this.div.style.top = `${ne.y}px`;
                this.div.style.width = `${ne.x - sw.x}px`;
                this.div.style.height = `${sw.y - ne.y}px`;
            }

            if (this.div) {
                // 현재 div의 회전 각도를 가져옵니다.
                const currentDegree = parseFloat(this.div.style.transform.replace(/[^\d.]/g, '')) || 0;
                // 목표 각도와의 차이를 계산합니다.
                let degreeDifference = this.degree - currentDegree;
                // 차이를 -180과 180 사이의 값으로 조정합니다.
                degreeDifference += (degreeDifference > 180) ? -360 : (degreeDifference < -180) ? 360 : 0;

                // 최종 회전 각도를 계산합니다.
                const finalDegree = currentDegree + degreeDifference;

                this.div.style.transition = 'transform 1s ease-out';
                this.div.style.transform = `rotate(${finalDegree}deg)`;
            }
        }

        onRemove() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
            }
        }

        hide() {
            if (this.div) this.div.style.visibility = "hidden";
        }

        show() {
            if (this.div) this.div.style.visibility = "visible";
        }

        toggle() {
            if (this.div) this.div.style.visibility = (this.div.style.visibility === "hidden") ? "visible" : "hidden";
        }

        toggleDOM(map) {
            this.setMap(this.getMap() ? null : map);
        }

        updateBounds() {
            if (!this.#moving) return;
            const elapsedTime = this.#getElapsedTimeInSeconds();
            const distanceTraveled = this.#calculateDistanceTraveled(elapsedTime);
            const currentLatLng = this.#getCurrentPosition(this.#startPosition, this.#destinationPosition, distanceTraveled);
            if (!currentLatLng || this.#hasReachedDestination(currentLatLng)) {
                console.log("Reached destination", currentLatLng.lat(), currentLatLng.lng(), this.#destinationPosition.lat(), this.#destinationPosition.lng());
                this.#setBounds(this.#destinationPosition.lat(), this.#destinationPosition.lng(), this.#size);
                this.draw();
                this.#moving = false;
                return;
            }
            this.#updateOverlayPosition(currentLatLng);
            this.draw();
            if (this.marker) {
                this.marker.setPosition(this.getCurrentCenter());
            }
        }

        #hasReachedDestination(currentLatLng) {
            return google.maps.geometry.spherical.computeDistanceBetween(currentLatLng, this.#destinationPosition) < 1; // Considered reached if within 1 meters
        }

        #getElapsedTimeInSeconds() {
            // console.log("getElapsedTimeInSeconds", (Date.now() - this.#startTime) / 1000);
            return (GlobalTimer.getInstance().getServerTime() - this.#startTime) / 1000;
        }

        #calculateDistanceTraveled(elapsedTime) {
            return elapsedTime * this.calculatedSpeed;
        }

        #updateOverlayPosition(currentLatLng) {
            this.#setBounds(currentLatLng.lat(), currentLatLng.lng(), this.#size);
        }

        getCurrentCenter() {
            const elapsedTime = this.#getElapsedTimeInSeconds();
            const distanceTraveled = this.#calculateDistanceTraveled(elapsedTime);
            const currentLatLng = this.#getCurrentPosition(this.#startPosition, this.#destinationPosition, distanceTraveled);
            return currentLatLng;
        }

        #getCurrentPosition(start, end, distance) {
            if (!(start instanceof google.maps.LatLng) || !(end instanceof google.maps.LatLng)) {
                console.error("start or end is not a google.maps.LatLng object");
                return null;
            }
            const totalDistance = google.maps.geometry.spherical.computeDistanceBetween(start, end);
            if (distance >= totalDistance) {
                return end;
            }
            const ratio = distance / totalDistance;
            const lat = start.lat() + (end.lat() - start.lat()) * ratio;
            const lng = start.lng() + (end.lng() - start.lng()) * ratio;
            return new google.maps.LatLng(lat, lng);
        }

        move(startPosition, destinationPosition, startTime) {
            this.degree = google.maps.geometry.spherical.computeHeading(new google.maps.LatLng(startPosition), new google.maps.LatLng(destinationPosition));

            console.log("move!!!!!!!!!!!!!!", startPosition, destinationPosition, startTime);
            this.#startPosition = new google.maps.LatLng(startPosition.lat, startPosition.lng);
            this.#destinationPosition = new google.maps.LatLng(destinationPosition.lat, destinationPosition.lng);


            console.log("startTime", startTime);
            console.log("now", GlobalTimer.getInstance().getServerTime());
            if ((GlobalTimer.getInstance().getServerTime() - startTime) < 0) {
                this.#startTime = GlobalTimer.getInstance().getServerTime();
            } else {
                this.#startTime = startTime;
            }

            this.#setBounds(this.#startPosition.lat(), this.#startPosition.lng(), this.#size);
            this.#moving = true;

            // 마커의 위치를 실시간으로 업데이트합니다.
            if (this.marker) {
                // 마커의 위치를 업데이트합니다.
                this.marker.setPosition(this.getCurrentCenter());
            }
        }

        showMarker() {
            if (!this.marker) {
                this.marker = new google.maps.Marker({
                    position: this.getCurrentCenter(),
                    map: this.map,
                    // 마커에 대한 추가 설정 (예: 아이콘)을 여기에 추가할 수 있습니다.
                });
            }
        }

        hideMarker() {
            if (this.marker) {
                this.marker.setMap(null);
                this.marker = null;
            }
        }
    }
}