/* eslint-disable no-undef */
import GlobalTimer from "../anim/GameTimer.js";
import MainPanel from "../control/MainPanel.js";

export default function createUnitOverlayClass() {
    return class UnitOverlay extends google.maps.OverlayView {
        #markerSize = 10;

        #bounds;
        #id;
        #startPosition;
        #destinationPosition;
        #startTime;
        #moving = false;
        #speed;
        #size;
        #userName;
        degree;
        isSelected = false;
        #followInterval;

        constructor(info) {
            super();
            this.polyline = null;
            this.degree = 0;
            this.#id = info.googleId;
            this.#size = info.size;
            this.#speed = info.speed;
            this.image = info.image;
            this.#startPosition = new google.maps.LatLng(info.startPosition.lat, info.startPosition.lng);
            this.#destinationPosition = new google.maps.LatLng(info.destinationPosition.lat, info.destinationPosition.lng);
            this.calculatedSpeed = info.speed / 3600;
            this.#startTime = info.startTime || GlobalTimer.getInstance().getServerTime();
            this.#userName = info.userName;
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
            this.div.style.cursor = "pointer"; // 마우스 커서 스타일 추가

            const img = new Image();
            img.onload = () => {
                this.div.append(img);
            };
            img.src = this.image;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.position = "absolute";

            const panes = this.getPanes();
            panes.overlayMouseTarget.appendChild(this.div);

            // Name
            this.#createUserNameDiv();
            this.#addEventListeners();
        }

        #addEventListeners() {
            var me = this;
            var touchHandled = false;

            function handleTouchEnd(event) {
                event.stopPropagation();
                event.preventDefault();
                touchHandled = true;
                google.maps.event.trigger(me, 'click');
            }

            function handleClick(event) {
                if (!touchHandled) {
                    event.stopPropagation();
                    event.preventDefault();
                    google.maps.event.trigger(me, 'click');
                }
                touchHandled = false;
            }

            google.maps.event.addDomListener(this.div, 'click', handleClick);
            google.maps.event.addDomListener(this.div, 'touchend', handleTouchEnd);

            google.maps.event.addListener(me, 'click', function () {
                me.isSelected = !me.isSelected;
                me.#updateCircle();
                if (me.isSelected) {
                    this.#followMarker();
                } else {
                    clearInterval(this.#followInterval);
                    this.#followInterval = null;
                }
            });

            // For mobile specifically, add touchstart and touchmove to handle touch interactions properly
            google.maps.event.addDomListener(this.div, 'touchstart', function (event) {
                event.stopPropagation();
                event.preventDefault();
            });

            google.maps.event.addDomListener(this.div, 'touchmove', function (event) {
                event.stopPropagation();
                event.preventDefault();
            });
        }

        #createUserNameDiv() {
            if (!this.userNameDiv) {
                this.userNameDiv = document.createElement('div');
                this.userNameDiv.className = 'custom-marker';
                this.userNameDiv.innerHTML = this.#userName;
                this.userNameDiv.style.color = 'white';
                this.userNameDiv.style.textShadow = '1px 1px 1px black';
                this.userNameDiv.style.fontSize = '12px';
                const panes = this.getPanes();
                panes.overlayMouseTarget.appendChild(this.userNameDiv);
            }
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

                const currentDegree = parseFloat(this.div.style.transform.replace(/[^\d.]/g, '')) || 0;
                let degreeDifference = this.degree - currentDegree;
                degreeDifference += (degreeDifference > 180) ? -360 : (degreeDifference < -180) ? 360 : 0;

                const finalDegree = currentDegree + degreeDifference;
                this.finalDegree = finalDegree;

                this.div.style.transition = 'transform 1s ease-out';
                this.div.style.transform = `rotate(${finalDegree}deg)`;
            }

            this.#updateUserNameDiv(sw, ne);
            this.#updateCircle();
        }

        #updateUserNameDiv(sw, ne) {
            if (this.userNameDiv) {
                this.userNameDiv.style.position = 'absolute';
                this.userNameDiv.style.left = `${sw.x + (ne.x - sw.x) / 2 - this.userNameDiv.offsetWidth / 2}px`;
                this.userNameDiv.style.top = `${sw.y}px`;
                this.userNameDiv.style.transform = 'translateY(100%)';
            }
        }

        #updateCircle() {
            if (!this.div) return;
            const divWidth = this.div.offsetWidth;
            const divHeight = this.div.offsetHeight;
            const radius = Math.max(divWidth, divHeight) / 2 + 10;

            if (this.isSelected) {
                if (!this.circle) {
                    this.circle = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    this.circle.style.position = "absolute";
                    this.circle.style.left = "0";
                    this.circle.style.top = "0";
                    this.circle.style.width = "100%";
                    this.circle.style.height = "100%";
                    this.circle.style.overflow = "visible";
                    this.circle.innerHTML = `
                        <circle cx="${divWidth / 2}" cy="${divHeight / 2}" r="${radius}" fill="none" stroke="#00FF00" stroke-width="2">
                            <animate attributeName="r" values="${radius};${radius + 5};${radius}" dur="1s" repeatCount="indefinite" />
                        </circle>
                    `;
                    this.div.appendChild(this.circle);
                } else {
                    const circle = this.circle.querySelector('circle');
                    circle.setAttribute('cx', divWidth / 2);
                    circle.setAttribute('cy', divHeight / 2);
                    circle.setAttribute('r', radius);
                    circle.querySelector('animate').setAttribute('values', `${radius};${radius + 5};${radius}`);
                }
            } else {
                if (this.circle) {
                    this.circle.remove();
                    this.circle = null;
                }
            }
        }

        onRemove() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
            }
            if (this.markerOverlay) {
                this.markerOverlay.setMap(null);
                this.markerOverlay = null;
            }
            if (this.polyline) {
                this.polyline.setMap(null);
                this.polyline = null;
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
                this.#setBounds(this.#destinationPosition.lat(), this.#destinationPosition.lng(), this.#size);
                this.draw();
                this.#moving = false;

                if (this.polyline) {
                    this.polyline.setMap(null);
                    this.polyline = null;
                }

                return;
            }
            this.#updateOverlayPosition(currentLatLng);
            this.draw();
            if (this.marker) {
                this.marker.setPosition(this.getCurrentCenter());
            }
            this.updatePolyline(currentLatLng);
        }

        #hasReachedDestination(currentLatLng) {
            return google.maps.geometry.spherical.computeDistanceBetween(currentLatLng, this.#destinationPosition) < 1;
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
            // Ensure start and end are google.maps.LatLng objects
            if (!(start instanceof google.maps.LatLng)) {
                start = new google.maps.LatLng(start.lat, start.lng);
            }
            if (!(end instanceof google.maps.LatLng)) {
                end = new google.maps.LatLng(end.lat, end.lng);
            }

            const totalDistance = google.maps.geometry.spherical.computeDistanceBetween(start, end);
            if (distance >= totalDistance) {
                return end;
            }
            const ratio = distance / totalDistance;
            return google.maps.geometry.spherical.interpolate(start, end, ratio);
        }

        move(startPosition, destinationPosition, startTime, clicked) {
            this.degree = google.maps.geometry.spherical.computeHeading(new google.maps.LatLng(startPosition), new google.maps.LatLng(destinationPosition));

            if (this.marker) {
                this.updateMarkerIcon(this.degree);
            }

            this.#startPosition = new google.maps.LatLng(startPosition.lat, startPosition.lng);
            this.#destinationPosition = new google.maps.LatLng(destinationPosition.lat, destinationPosition.lng);

            if (!clicked) {
                this.#startTime = GlobalTimer.getInstance().getServerTime();
            } else {
                this.#startTime = startTime;
            }

            this.#setBounds(this.#startPosition.lat(), this.#startPosition.lng(), this.#size);
            this.#moving = true;

            if (this.marker) {
                this.marker.setPosition(this.getCurrentCenter());
            }

            this.updatePolyline(this.getCurrentCenter());

            // Calculate and display arrival time
            const totalDistance = google.maps.geometry.spherical.computeDistanceBetween(this.#startPosition, this.#destinationPosition);
            const travelTimeSeconds = totalDistance / (this.#speed / 3.6); // speed in m/s

            const arrivalTime = new Date(this.#startTime + travelTimeSeconds * 1000);

            const hours = arrivalTime.getHours();
            const minutes = arrivalTime.getMinutes();
            const seconds = arrivalTime.getSeconds();

            const formattedDate = arrivalTime.toLocaleDateString();
            const formattedTime = arrivalTime.toLocaleTimeString();

            MainPanel.getInstance().addChat({ sender: "안내", message: `도착 예정 시간: ${formattedDate} ${formattedTime} (소요시간: ${hours}시간 ${minutes}분 ${seconds}초)` });
        }




        updateMarkerIcon() {
            if (this.marker) {
                this.marker.setPosition(this.getCurrentCenter());
            }
        }




        showMarker() {
            if (!this.marker) {
                this.marker = new google.maps.Marker({
                    position: { lat: this.getCurrentCenter().lat(), lng: this.getCurrentCenter().lng() },
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#800080', // 보라색
                        fillOpacity: 1.0,
                        strokeColor: '#FFFFFF', // 하얀 테두리
                        strokeWeight: 2,
                        scale: 5 // 점의 크기 조절
                    },
                });

                // 마커에 클릭 이벤트 리스너 추가
                google.maps.event.addListener(this.marker, 'click', () => {
                    this.isSelected = !this.isSelected;
                    this.#updateCircle();
                    if (this.isSelected) {
                        this.map.setZoom(16);
                        this.#followMarker();
                    } else {
                        clearInterval(this.#followInterval);
                        this.#followInterval = null;
                    }
                });
            }
        }

        smoothPanTo(map, targetLatLng, duration) {
            const startLatLng = map.getCenter();
            const startTime = performance.now();

            function animate(time) {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const interpolatedLat = startLatLng.lat() + (targetLatLng.lat() - startLatLng.lat()) * progress;
                const interpolatedLng = startLatLng.lng() + (targetLatLng.lng() - startLatLng.lng()) * progress;
                map.setCenter(new google.maps.LatLng(interpolatedLat, interpolatedLng));

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            }

            requestAnimationFrame(animate);
        }

        #followMarker() {
            this.#followInterval = setInterval(() => {
                //console.log('getCurrentCenter', this.getCurrentCenter());
                this.smoothPanTo(this.map, this.getCurrentCenter(), 1000);
            }, 1000);
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

        updatePolyline(currentLatLng) {
            const path = [currentLatLng, this.#destinationPosition];
            if (!this.polyline) {
                this.polyline = new google.maps.Polyline({
                    path: path,
                    geodesic: true, // 지구의 곡률을 따르도록 설정
                    //어두운 붉은색
                    strokeColor: '#FF5555',
                    strokeOpacity: 0.4,
                    strokeWeight: 2,
                    icons: [{
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 0.4,
                            scale: 2
                        },
                        offset: '0',
                        repeat: '20px'
                    }],
                    clickable: false,
                    map: this.map // 폴리라인을 지도에 추가
                });
            } else {
                this.polyline.setPath(path);
                this.polyline.setMap(this.map);
            }
        }
    }
}
