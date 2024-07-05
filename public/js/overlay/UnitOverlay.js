export default function createUnitOverayClass() {
    return class UnitOveray extends google.maps.OverlayView {
        #bounds;
        #id;
        #startPosition;
        #startTime;
        #destinationPosition;
        #moving = true;
        #speed;
        #size;

        constructor(info) {
            super();
            this.#id = info.googleId;
            this.#size = info.size;
            this.#speed = info.speed;
            this.image = info.image;
            this.#startPosition = { lat: info.lat, lng: info.lng };
            this.currentPosition = { lat: info.lat, lng: info.lng };
            this.#destinationPosition = { lat: info.lat, lng: info.lng };
            this.calculatedSpeed = info.speed * 1000 / 3600;
            this.#setBounds(info.lat, info.lng, info.size);
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

        get id() {
            return this.#id;
        }

        set id(value) {
            this.#id = value;
        }

        get lat() {
            return this.bounds.getCenter().lat();
        }

        get lng() {
            return this.bounds.getCenter().lng();
        }

        get startPosition() {
            return this.#startPosition;
        }

        get speed() {
            return this.#speed;
        }

        get size() {
            return this.#size;
        }

        /**
         * onAdd is called when the map's panes are ready and the overlay has been
         * added to the map.
         */
        onAdd() {
            this.div = document.createElement("div");
            this.div.style.borderStyle = "none";
            this.div.style.borderWidth = "0px";
            this.div.style.position = "absolute";

            // Create the img element and attach it to the div.
            const img = new Image();
            img.onload = () => {
                this.div.append(img);
            };

            img.src = this.image;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.position = "absolute";

            // Add the element to the "overlayLayer" pane.
            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this.div);
        }

        draw() {
            if (!this.#bounds) {
                console.log('bounds is null');
                return;
            }

            const overlayProjection = this.getProjection();
            if (!overlayProjection) {
                console.log('overlayProjection is null');
                return;
            }

            const sw = overlayProjection.fromLatLngToDivPixel(
                this.#bounds.getSouthWest(),
            );
            const ne = overlayProjection.fromLatLngToDivPixel(
                this.#bounds.getNorthEast(),
            );

            if (this.div) {
                // 변경된 부분: 스타일 변경이 필요한 경우에만 적용
                const newLeft = `${sw.x}px`;
                const newTop = `${ne.y}px`;
                const newWidth = `${ne.x - sw.x}px`;
                const newHeight = `${sw.y - ne.y}px`;

                if (this.div.style.left !== newLeft) this.div.style.left = newLeft;
                if (this.div.style.top !== newTop) this.div.style.top = newTop;
                if (this.div.style.width !== newWidth) this.div.style.width = newWidth;
                if (this.div.style.height !== newHeight) this.div.style.height = newHeight;
            }
        }

        onRemove() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                delete this.div;
            }
        }

        hide() {
            if (this.div) {
                this.div.style.visibility = "hidden";
            }
        }
        show() {
            if (this.div) {
                this.div.style.visibility = "visible";
            }
        }
        toggle() {
            if (this.div) {
                if (this.div.style.visibility === "hidden") {
                    this.show();
                } else {
                    this.hide();
                }
            }
        }
        toggleDOM(map) {
            if (this.getMap()) {
                this.setMap(null);
            } else {
                this.setMap(map);
            }
        }


        updateBounds() {
            if (!this.#moving) {
                return;
            }

            const elapsedTime = this.#getElapsedTimeInSeconds();
            const distanceTraveled = this.#calculateDistanceTraveled(elapsedTime);

            const currentLatLng = this.#getCurrentPosition(this.#startPosition, this.#destinationPosition, distanceTraveled);

            if (currentLatLng === null) {
                console.log('currentLatLng is null');
                return;
            }

            if (this.#hasReachedDestination(currentLatLng)) {
                console.log('reached destination');
                this.draw();
                this.#moving = false;
            } else {
                this.#updateOverlayPosition(currentLatLng);
                this.draw();
            }
        }

        #hasReachedDestination(currentLatLng) {
            return currentLatLng.equals(this.#destinationPosition);
        }

        #getElapsedTimeInSeconds() {
            return (Date.now() - this.#startTime) / 1000; // Convert milliseconds to seconds
        }

        #calculateDistanceTraveled(elapsedTime) {
            return elapsedTime * this.calculatedSpeed; // Distance = Time * Speed
        }

        #updateOverlayPosition(currentLatLng) {
            const oldCenter = this.#bounds.getCenter();
            const latDiff = currentLatLng.lat() - oldCenter.lat();
            const lngDiff = currentLatLng.lng() - oldCenter.lng();

            const sw = this.#bounds.getSouthWest();
            const ne = this.#bounds.getNorthEast();

            const newSW = new google.maps.LatLng(sw.lat() + latDiff, sw.lng() + lngDiff);
            const newNE = new google.maps.LatLng(ne.lat() + latDiff, ne.lng() + lngDiff);

            this.#bounds = new google.maps.LatLngBounds(newSW, newNE);
        }

        #getCurrentPosition(start, end, distance) {
            if (!start || !end) {
                return null;
            }
            const totalDistance = google.maps.geometry.spherical.computeDistanceBetween(start, end);

            if (distance >= totalDistance) {
                return end;
            }

            if (start.equals(end)) {
                return end;
            }

            const ratio = distance / totalDistance;
            const lat = start.lat() + (end.lat() - start.lat()) * ratio;
            const lng = start.lng() + (end.lng() - start.lng()) * ratio;
            //console.log('current', lat, lng);
            return new google.maps.LatLng(lat, lng);
        }

        move(destLat, destLng) {
            this.#startPosition = this.#bounds.getCenter();
            this.#destinationPosition = new google.maps.LatLng(destLat, destLng);
            this.#startTime = Date.now();
            this.#moving = true;
        }
    }
}