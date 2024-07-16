import GlobalTimer from "../anim/GameTimer.js";

export default function createUnitOverlayClass() {
    return class UnitOverlay extends google.maps.OverlayView {
        #markerSize = 30;

        #bounds;
        #id;
        #startPosition;
        #destinationPosition;
        #startTime;
        #moving = false;
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
            this.calculatedSpeed = info.speed / 3600;
            this.#startTime = info.startTime || GlobalTimer.getInstance().getServerTime();
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

        set startTime(value) {
            this.#startTime = value;
        }

        get speed() {
            return this.#speed;
        }

        get size() {
            return this.#size;
        }

        set startPosition(value) {
            this.#startPosition = value;
        }

        set size(value) {
            this.#size = value;
        }

        set speed(value) {
            this.#speed = value;
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
                this.finalDegree = finalDegree;

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
            return (GlobalTimer.getInstance().getServerTime() - this.#startTime);
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

        move(startPosition, destinationPosition, startTime, clicked) {
            this.degree = google.maps.geometry.spherical.computeHeading(new google.maps.LatLng(startPosition), new google.maps.LatLng(destinationPosition));

            if (this.marker) {
                this.updateMarkerIcon(this.degree);
            }

            console.log("move!!!!!!!!!!!!!!", startPosition, destinationPosition, startTime);
            this.#startPosition = new google.maps.LatLng(startPosition.lat, startPosition.lng);
            this.#destinationPosition = new google.maps.LatLng(destinationPosition.lat, destinationPosition.lng);


            console.log("startTime", startTime);
            //MainPanel.getInstance().addChat({ sender: "move()", message: `startTime : ${startTime}` });
            console.log("server time", GlobalTimer.getInstance().getServerTime());
            //MainPanel.getInstance().addChat({ sender: "move()", message: `server time : ${GlobalTimer.getInstance().getServerTime()}` });

            if (!clicked) {
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

        updateMarkerIcon(angle) {
            this.rotateImage(this.image, angle, rotatedImageUrl => {
                this.marker.setIcon({
                    url: rotatedImageUrl,
                    // Make sure to keep the existing icon size and anchor if needed
                    scaledSize: new google.maps.Size(this.#markerSize, this.#markerSize),
                    anchor: new google.maps.Point(this.#markerSize / 2, this.#markerSize / 2)
                });
            });
        }


        // 수정된 showMarker 메서드
        showMarker() {
            /* global google */
            const mapsSize = new google.maps.Size(this.#markerSize, this.#markerSize);
            const anchor = new google.maps.Point(this.#markerSize / 2, this.#markerSize / 2);
            if (!this.marker) {
                this.rotateImage(this.image, this.finalDegree ? this.finalDegree : 0, rotatedImageUrl => {
                    this.marker = new google.maps.Marker({
                        position: { lat: this.getCurrentCenter().lat(), lng: this.getCurrentCenter().lng() },
                        map: this.map,
                        icon: {
                            url: rotatedImageUrl,
                            scaledSize: mapsSize,
                            anchor: anchor
                        }
                    });
                });
            } else {
                // 이미 마커가 존재하면 이미지만 업데이트
                this.rotateImage(this.image, this.finalDegree ? this.finalDegree : 0, rotatedImageUrl => {
                    this.marker.setIcon({
                        url: rotatedImageUrl,
                        scaledSize: mapsSize,
                        anchor: anchor
                    });
                });
            }
        }

        hideMarker() {
            if (this.marker) {
                this.marker.setMap(null);
                this.marker = null;
            }
        }

        hideOverlay() {
            this.div.style.visibility = "hidden";
        }

        showOverlay() {
            this.div.style.visibility = "visible";
        }

        rotateImage(imageUrl, angle, callback) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const image = new Image();

            image.onload = function () {
                canvas.width = image.width;
                canvas.height = image.height;
                context.translate(canvas.width / 2, canvas.height / 2);
                context.rotate(angle * Math.PI / 180);
                context.drawImage(image, -image.width / 2, -image.height / 2);
                callback(canvas.toDataURL());
            };

            image.src = imageUrl;
        }
    }
}