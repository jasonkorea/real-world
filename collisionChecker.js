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

        // 최적화된 충돌 예측
        const collisionTimeMillis = optimizedPredictCollisionTime(
            currentLatLngA, currentLatLngB, speedA, speedB, radiusA, radiusB, destinationPositionA, destinationPositionB
        );

        if (collisionTimeMillis === -1) {
            console.log("No collision detected.");
        } else {
            console.log(`Collision detected at time ${collisionTimeMillis}`);
        }

        console.log("----- Collision Check End -----");
        return collisionTimeMillis;
    }
};

function optimizedPredictCollisionTime(currentA, currentB, speedA, speedB, radiusA, radiusB, destinationA, destinationB) {
    const timeStep = 0.5; // 500ms 단위로 체크 (시간 단위 조정)
    const maxTime = 30; // 최대 30초 동안 충돌 체크 (범위 축소)

    for (let t = 0; t < maxTime; t += timeStep) {
        const futureA = calculateFuturePosition(currentA, destinationA, speedA, t);
        const futureB = calculateFuturePosition(currentB, destinationB, speedB, t);
        const distanceBetweenUnits = computeDistanceBetween(futureA, futureB);

        if (distanceBetweenUnits <= (radiusA + radiusB)) {
            console.log(`Collision detected at t=${t}s`);
            return Date.now() + t * 1000; // 충돌 시간 반환
        }
    }

    return -1; // 충돌 없음
}

// 미래의 위치를 계산하는 함수
function calculateFuturePosition(currentPosition, destination, speed, time) {
    const totalDistance = computeDistanceBetween(currentPosition, destination);
    const distanceTraveled = (speed * time) / 3600; // km 단위

    if (distanceTraveled >= totalDistance) {
        return destination;
    }

    const ratio = distanceTraveled / totalDistance;
    return interpolatePosition(currentPosition, destination, ratio);
}

function interpolatePosition(start, end, ratio) {
    const φ1 = start.lat * Math.PI / 180;
    const λ1 = start.lng * Math.PI / 180;
    const φ2 = end.lat * Math.PI / 180;
    const λ2 = end.lng * Math.PI / 180;

    const δφ = φ2 - φ1;
    const δλ = λ2 - λ1;

    const A = Math.sin((1 - ratio) * δφ) / Math.sin(δφ);
    const B = Math.sin(ratio * δφ) / Math.sin(δφ);

    const x = A * Math.cos(φ1) + B * Math.cos(φ2);
    const y = A * Math.sin(φ1) + B * Math.sin(φ2);

    const newLat = Math.atan2(y, x) * 180 / Math.PI;
    const newLng = (λ1 + ratio * δλ) * 180 / Math.PI;

    return { lat: newLat, lng: newLng };
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