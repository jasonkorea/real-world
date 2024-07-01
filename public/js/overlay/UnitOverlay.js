export default function createUnitOverayClass() {
    return class UnitOveray extends google.maps.OverlayView {
        bounds;
        image;
        div;
        id;
        startPosition;
        startTime;
        destinationPosition;
        moving = false;
        speed; // 15km/h
        constructor(id, bounds, image, speedKmPerHour = 15) {
            super();
            this.id = id;
            this.bounds = bounds;
            this.image = image;
            this.startPosition = bounds.getCenter();
            this.speed = speedKmPerHour * 1000 / 3600;
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
            const img = document.createElement("img");

            img.src = this.image;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.position = "absolute";
            this.div.appendChild(img);

            // Add the element to the "overlayLayer" pane.
            const panes = this.getPanes();

            panes.overlayLayer.appendChild(this.div);
        }

        draw() {
            const overlayProjection = this.getProjection();
            const sw = overlayProjection.fromLatLngToDivPixel(
                this.bounds.getSouthWest(),
            );
            const ne = overlayProjection.fromLatLngToDivPixel(
                this.bounds.getNorthEast(),
            );

            if (this.div) {
                this.div.style.left = sw.x + "px";
                this.div.style.top = ne.y + "px";
                this.div.style.width = ne.x - sw.x + "px";
                this.div.style.height = sw.y - ne.y + "px";
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
            if (!this.moving) {
                return;
            }

            console.log('updateBounds');
            const elapsedTime = (Date.now() - this.startTime) / 1000; // seconds
            const distanceToTravel = elapsedTime * this.speed; // meters

            const currentLatLng = this.#getCurrentPosition(this.startPosition, this.destinationPosition, distanceToTravel);

            //목적지에 도착했을 때 이동을 멈추기
            if (currentLatLng.equals(this.destinationPosition)) {
                this.moving = false;
            }
            
            const oldCenter = this.bounds.getCenter();
            const newCenter = currentLatLng;

            const latDiff = newCenter.lat() - oldCenter.lat();
            const lngDiff = newCenter.lng() - oldCenter.lng();

            const sw = this.bounds.getSouthWest();
            const ne = this.bounds.getNorthEast();

            const newSW = new google.maps.LatLng(sw.lat() + latDiff, sw.lng() + lngDiff);
            const newNE = new google.maps.LatLng(ne.lat() + latDiff, ne.lng() + lngDiff);

            this.bounds = new google.maps.LatLngBounds(newSW, newNE);
            this.draw();
        }

        #getCurrentPosition(start, end, distance) {
            const totalDistance = google.maps.geometry.spherical.computeDistanceBetween(start, end);

            if (distance >= totalDistance) {
                return end;
            }

            const ratio = distance / totalDistance;
            const lat = start.lat() + (end.lat() - start.lat()) * ratio;
            const lng = start.lng() + (end.lng() - start.lng()) * ratio;
            //console.log('current', lat, lng);
            return new google.maps.LatLng(lat, lng);
        }

        move(destLat, destLng) {
            this.startPosition = this.bounds.getCenter();
            this.destinationPosition = new google.maps.LatLng(destLat, destLng);
            this.startTime = Date.now();
            this.moving = true;
        }
    }
}