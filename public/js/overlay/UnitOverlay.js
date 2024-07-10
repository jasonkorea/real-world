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

        constructor(info) {
            super();
            this.#id = info.googleId;
            this.#size = info.size;
            this.#speed = info.speed;
            this.image = info.image;
            this.#startPosition = new google.maps.LatLng(info.startPosition.lat, info.startPosition.lng);
            this.#destinationPosition = new google.maps.LatLng(info.destinationPosition.lat, info.destinationPosition.lng);
            this.calculatedSpeed = info.speed * 1000 / 3600;
            this.#startTime = info.startTime || Date.now();
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
            //console.log("updateBounds");
            const elapsedTime = this.#getElapsedTimeInSeconds();
            const distanceTraveled = this.#calculateDistanceTraveled(elapsedTime);
            const currentLatLng = this.#getCurrentPosition(this.#startPosition, this.#destinationPosition, distanceTraveled);
            if (!currentLatLng || this.#hasReachedDestination(currentLatLng)) {
                console.log("Reached destination", currentLatLng.lat(), currentLatLng.lng(), this.#destinationPosition.lat(), this.#destinationPosition.lng());
                //update bounds
                this.#setBounds(this.#destinationPosition.lat(), this.#destinationPosition.lng(), this.#size);
                this.draw();
                this.#moving = false;
                return;
            }
            this.#updateOverlayPosition(currentLatLng);

            this.draw();
        }

        #hasReachedDestination(currentLatLng) {
            return google.maps.geometry.spherical.computeDistanceBetween(currentLatLng, this.#destinationPosition) < 1; // Considered reached if within 1 meters
        }

        #getElapsedTimeInSeconds() {
            // console.log("getElapsedTimeInSeconds", (Date.now() - this.#startTime) / 1000);
            return (Date.now() - this.#startTime) / 1000;
        }

        #calculateDistanceTraveled(elapsedTime) {
            return elapsedTime * this.calculatedSpeed;
        }

        #updateOverlayPosition(currentLatLng) {
            this.#setBounds(currentLatLng.lat(), currentLatLng.lng(), this.#size);
        }

        getCurrentCenter() {
            console.log("getCurrentCenter");
            return this.#bounds.getCenter();
        }

        #getCurrentPosition(start, end, distance) {
            //            console.log("start, end, distance", start, end, distance);

            if (!(start instanceof google.maps.LatLng) || !(end instanceof google.maps.LatLng)) {
                console.error("start or end is not a google.maps.LatLng object");
                return null; // Or handle error appropriately
            }
            // console.log("start lat lng", start.lat(), start.lng());
            // console.log("end lat lng", end.lat(), end.lng());

            const totalDistance = google.maps.geometry.spherical.computeDistanceBetween(start, end);
            if (distance >= totalDistance) {
                console.log("distance, totalDistance", distance, totalDistance);
                return end;
            }

            const ratio = distance / totalDistance;
            const lat = start.lat() + (end.lat() - start.lat()) * ratio;
            const lng = start.lng() + (end.lng() - start.lng()) * ratio;
            return new google.maps.LatLng(lat, lng);
        }

        move(startPosition, destinationPosition, startTime) {
            console.log("move!!!!!!!!!!!!!!", startPosition, destinationPosition, startTime);
            this.#startPosition = new google.maps.LatLng(startPosition.lat, startPosition.lng);
            this.#destinationPosition = new google.maps.LatLng(destinationPosition.lat, destinationPosition.lng);
            this.#setBounds(this.#startPosition.lat(), this.#startPosition.lng(), this.#size);

            
            console.log("startTime", startTime);
            console.log("now", Date.now());
            //둘 차이 1자리 소수점 초단위 출력
            if ((Date.now() - startTime) / 1000 < 0) {
                this.#startTime = Date.now();
            } else {
                this.#startTime = startTime;
            }

            this.#moving = true;
        }
    }
}