const R = 6371e3; // 지구 반지름 (미터 단위)

module.exports = {
    collisionCheck: function (moveInfo1, moveInfo2) {
        const currentTimeMillis = Date.now();

        console.log("----- Collision Check Start -----");
        console.log("Current Time (ms):", currentTimeMillis);
        console.log("moveInfo1.id:", moveInfo1.id, "moveInfo2.id:", moveInfo2.id);

        const speedA = moveInfo1.speed; // km/h 단위
        const speedB = moveInfo2.speed; // km/h 단위
        console.log("Speed A (km/h):", speedA, "Speed B (km/h):", speedB);

        const startPositionA = convertDecimal128ToNumber(moveInfo1.startPosition);
        const destinationPositionA = convertDecimal128ToNumber(moveInfo1.destinationPosition);
        const startPositionB = convertDecimal128ToNumber(moveInfo2.startPosition);
        const destinationPositionB = convertDecimal128ToNumber(moveInfo2.destinationPosition);
        console.log("Start Position A:", startPositionA, "Destination Position A:", destinationPositionA);
        console.log("Start Position B:", startPositionB, "Destination Position B:", destinationPositionB);

        const requestTimeMillisA = moveInfo1.startTime;
        const requestTimeMillisB = moveInfo2.startTime;
        console.log("Request Time A (ms):", requestTimeMillisA, "Request Time B (ms):", requestTimeMillisB);

        const elapsedTimeA = (currentTimeMillis - requestTimeMillisA) / 1000; // 초 단위
        const elapsedTimeB = (currentTimeMillis - requestTimeMillisB) / 1000; // 초 단위
        console.log("Elapsed Time A (s):", elapsedTimeA, "Elapsed Time B (s):", elapsedTimeB);

        const currentLatLngA = getCurrentPosition(startPositionA, destinationPositionA, (speedA * elapsedTimeA) / 3600);
        const currentLatLngB = getCurrentPosition(startPositionB, destinationPositionB, (speedB * elapsedTimeB) / 3600);
        console.log("Current Position A:", currentLatLngA, "Current Position B:", currentLatLngB);

        const radiusA = moveInfo1.size / 1000 / 2; // 반경을 km로 변환
        const radiusB = moveInfo2.size / 1000 / 2; // 반경을 km로 변환
        console.log("Radius A (km):", radiusA, "Radius B (km):", radiusB);

        // 미래의 위치를 기반으로 충돌 예측
        const collisionTimeMillis = predictCollisionTime(currentLatLngA, currentLatLngB, speedA, speedB, radiusA, radiusB, destinationPositionA, destinationPositionB);

        if (collisionTimeMillis === -1) {
            console.log("No collision detected.");
        } else {
            console.log(`Collision detected at time ${collisionTimeMillis}`);
        }

        console.log("----- Collision Check End -----");
        return collisionTimeMillis;
    }
};

// 미래의 위치를 계산하는 함수
function calculateFuturePosition(currentPosition, direction, speed, time) {
    const distance = (speed * time) / 3600; // km 단위
    return getCurrentPosition(currentPosition, direction, distance);
}

// 충돌 예측을 계산하는 함수
function predictCollisionTime(currentA, currentB, speedA, speedB, radiusA, radiusB, destinationA, destinationB) {
    const relativeSpeed = computeRelativeSpeedAdvanced(currentA, currentB, speedA, speedB, currentA, destinationA, currentB, destinationB);
    console.log("Computed Relative Speed (km/h):", relativeSpeed);

    const timeStep = 0.1; // 100ms 단위로 체크
    for (let t = 0; t < 60; t += timeStep) { // 최대 60초 동안 충돌 체크
        const futureA = calculateFuturePosition(currentA, destinationA, speedA, t);
        const futureB = calculateFuturePosition(currentB, destinationB, speedB, t);
        const distanceBetweenUnits = computeDistanceBetween(futureA, futureB);
        console.log(`At time t=${t}s, Distance Between Units (km): ${distanceBetweenUnits}`);

        if (distanceBetweenUnits <= (radiusA + radiusB)) {
            console.log(`Collision detected at t=${t}s`);
            return Date.now() + t * 1000; // 충돌 시간 반환
        }
    }

    return -1; // 충돌 없음
}

function convertDecimal128ToNumber(position) {
    return {
        lat: parseFloat(position.lat.toString()),
        lng: parseFloat(position.lng.toString())
    };
}

function getCurrentPosition(start, end, distance) {
    const totalDistance = computeDistanceBetween(start, end);
    if (distance >= totalDistance) {
        return end;
    }
    const ratio = distance / totalDistance;
    return {
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio
    };
}

function computeDistanceBetween(startLatLng, destLatLng) {
    const φ1 = startLatLng.lat * Math.PI / 180;
    const φ2 = destLatLng.lat * Math.PI / 180;
    const Δφ = (destLatLng.lat - startLatLng.lat) * Math.PI / 180;
    const Δλ = (destLatLng.lng - startLatLng.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c / 1000; // 거리 (킬로미터 단위)
}

function computeRelativeSpeedAdvanced(currentA, currentB, speedA, speedB, startA, endA, startB, endB) {
    const directionA = { lat: endA.lat - startA.lat, lng: endA.lng - startA.lng };
    const isAStationary = startA.lat === endA.lat && startA.lng === endA.lng;
    const isBStationary = startB.lat === endB.lat && startB.lng === endB.lng;
    let relativeSpeed;

    if (isAStationary) {
        relativeSpeed = speedB;
    } else if (isBStationary) {
        relativeSpeed = speedA;
    } else {
        const directionB = { lat: endB.lat - startB.lat, lng: endB.lng - startB.lng };
        const magnitudeA = Math.sqrt(directionA.lat ** 2 + directionA.lng ** 2);
        const magnitudeB = Math.sqrt(directionB.lat ** 2 + directionB.lng ** 2);
        const normalizedDirectionA = { lat: directionA.lat / magnitudeA, lng: directionA.lng / magnitudeA };
        const normalizedDirectionB = { lat: directionB.lat / magnitudeB, lng: directionB.lng / magnitudeB };
        const dotProduct = normalizedDirectionA.lat * normalizedDirectionB.lat + normalizedDirectionA.lng * normalizedDirectionB.lng;
        const angleBetween = Math.acos(dotProduct);

        relativeSpeed = Math.sqrt(speedA ** 2 + speedB ** 2 - 2 * speedA * speedB * Math.cos(angleBetween));
    }

    if (isNaN(relativeSpeed)) {
        relativeSpeed = speedA;
    }

    return relativeSpeed;
}