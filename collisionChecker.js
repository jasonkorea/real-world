const R = 6371e3; // 지구 반지름 (미터 단위)
const TOLERANCE = 0.01;

module.exports = {
    collisionCheck: function (moveInfo1, moveInfo2) {
        const currentTimeMillis = Date.now();

        console.log("moveInfo1.id:", moveInfo1.id, "moveInfo2.id:", moveInfo2.id);

        const calculatedSpeedA = moveInfo1.speed; // km/h 단위
        console.log("calculatedSpeedA:", calculatedSpeedA);
        const calculatedSpeedB = moveInfo2.speed; // km/h 단위
        console.log("calculatedSpeedB:", calculatedSpeedB);

        const startPositonA = convertDecimal128ToNumber(moveInfo1.startPosition);
        console.log("startPositonA:", startPositonA);

        const destinationPositionA = convertDecimal128ToNumber(moveInfo1.destinationPosition);
        console.log("destinationPositionA:", destinationPositionA);

        const startPositonB = convertDecimal128ToNumber(moveInfo2.startPosition);
        console.log("startPositonB:", startPositonB);
        
        const destinationPositionB = convertDecimal128ToNumber(moveInfo2.destinationPosition);
        console.log("destinationPositionB:", destinationPositionB);

        const requestTimeMillisA = moveInfo1.startTime;
        const requestTimeMillisB = moveInfo2.startTime;

        const elapsedTimeA = (currentTimeMillis - requestTimeMillisA) / 1000; // Convert to seconds
        const elapsedTimeB = (currentTimeMillis - requestTimeMillisB) / 1000; // Convert to seconds
        const distanceTraveledA = calculatedSpeedA * elapsedTimeA;
        const distanceTraveledB = calculatedSpeedB * elapsedTimeB;

        console.log("elapsedTimeA:", elapsedTimeA, "elapsedTimeB:", elapsedTimeB);
        console.log("distanceTraveledA:", distanceTraveledA, "distanceTraveledB:", distanceTraveledB);

        const radiusA = moveInfo1.size / 2;
        console.log("radiusA:", radiusA);
        const radiusB = moveInfo2.size / 2;
        console.log("radiusB:", radiusB);

        const currentLatLngA = getCurrentPosition(startPositonA, destinationPositionA, distanceTraveledA);
        const currentLatLngB = getCurrentPosition(startPositonB, destinationPositionB, distanceTraveledB);

        console.log("currentLatLngA:", currentLatLngA, "currentLatLngB:", currentLatLngB);

        const distance = computeDistanceBetween(currentLatLngA, currentLatLngB);
        console.log("distance between current positions:", distance);

        if (!arePathsCrossingWithRadius(startPositonA, destinationPositionA, radiusA, startPositonB, destinationPositionB, radiusB)) {
            console.log("Paths do not cross");
            return -1; // 경로가 교차하지 않으면 충돌 없음
        }

        let collisionTime;
        if (calculatedSpeedA === 0 && calculatedSpeedB === 0) {
            console.log("No collision: Both speeds are 0");
            return -1; // 두 객체가 모두 정지 상태이면 충돌 없음
        } else if (calculatedSpeedA === 0) {
            collisionTime = (distance - radiusA - radiusB) / (calculatedSpeedB / 3.6); // km/h to m/s
        } else if (calculatedSpeedB === 0) {
            collisionTime = (distance - radiusA - radiusB) / (calculatedSpeedA / 3.6); // km/h to m/s
        } else {
            collisionTime = (distance - radiusA - radiusB) / ((calculatedSpeedA + calculatedSpeedB) / 3.6); // km/h to m/s
        }
        console.log("collisionTime:", collisionTime);

        if (collisionTime <= 0) {
            console.log("No collision: collisionTime <= 0");
            return -1; // 충돌 시간이 현재 또는 이전이면 충돌 없음
        } else {
            console.log(`Collision detected between unit ${moveInfo1.id} and unit ${moveInfo2.id} at time ${collisionTime}`);
            return collisionTime;
        }
    }
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
    if (!startLatLng || !destLatLng || startLatLng.lat == null || startLatLng.lng == null || destLatLng.lat == null || destLatLng.lng == null) {
        console.error("Invalid input points:", startLatLng, destLatLng);
        return NaN;
    }

    if (startLatLng.lat === destLatLng.lat && startLatLng.lng === destLatLng.lng) {
        return 0;
    }

    const φ1 = startLatLng.lat * Math.PI / 180;
    const φ2 = destLatLng.lat * Math.PI / 180;
    const Δφ = (destLatLng.lat - startLatLng.lat) * Math.PI / 180;
    const Δλ = (destLatLng.lng - startLatLng.lng) * Math.PI / 180;

    console.log("φ1:", φ1, "φ2:", φ2, "Δφ:", Δφ, "Δλ:", Δλ);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    console.log("a:", a);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    console.log("c:", c);

    const dist = R * c;
    console.log("distance:", dist);
    return dist; // 거리 (미터 단위)
}

function arePathsCrossingWithRadius(startA, endA, radiusA, startB, endB, radiusB) {
    const adjustedStartA = adjustPointByRadius(startA, radiusA);
    const adjustedEndA = adjustPointByRadius(endA, radiusA);
    const adjustedStartB = adjustPointByRadius(startB, radiusB);
    const adjustedEndB = adjustPointByRadius(endB, radiusB);

    console.log("adjustedStartA:", adjustedStartA, "adjustedEndA:", adjustedEndA);
    console.log("adjustedStartB:", adjustedStartB, "adjustedEndB:", adjustedEndB);

    const intersect = doLinesIntersect(adjustedStartA, adjustedEndA, adjustedStartB, adjustedEndB, radiusA, radiusB);
    console.log("Paths intersect:", intersect);
    return intersect;
}

function adjustPointByRadius(point, radius) {
    const earthRadius = 6371e3; // Earth's radius in meters
    const dLat = radius / earthRadius;
    const dLng = radius / (earthRadius * Math.cos(point.lat * Math.PI / 180));

    return {
        lat: point.lat + (dLat * 180 / Math.PI),
        lng: point.lng + (dLng * 180 / Math.PI)
    };
}

function doLinesIntersect(p1, p2, p3, p4, radius1, radius2) {
    const d1 = direction(p3, p4, p1);
    const d2 = direction(p3, p4, p2);
    const d3 = direction(p1, p2, p3);
    const d4 = direction(p1, p2, p4);

    console.log("d1:", d1, "d2:", d2, "d3:", d3, "d4:", d4);

    if (((d1 > TOLERANCE && d2 < -TOLERANCE) || (d1 < -TOLERANCE && d2 > TOLERANCE)) &&
        ((d3 > TOLERANCE && d4 < -TOLERANCE) || (d3 < -TOLERANCE && d4 > TOLERANCE))) {
        console.log("Lines intersect based on direction.");
        return true;
    }

    if (Math.abs(d1) <= TOLERANCE && onSegment(p3, p4, p1)) {
        console.log("Point p1 is on segment p3-p4.");
        return true;
    }
    if (Math.abs(d2) <= TOLERANCE && onSegment(p3, p4, p2)) {
        console.log("Point p2 is on segment p3-p4.");
        return true;
    }
    if (Math.abs(d3) <= TOLERANCE && onSegment(p1, p2, p3)) {
        console.log("Point p3 is on segment p1-p2.");
        return true;
    }
    if (Math.abs(d4) <= TOLERANCE && onSegment(p1, p2, p4)) {
        console.log("Point p4 is on segment p1-p2.");
        return true;
    }

    // 추가: 객체의 크기를 고려한 충돌 감지
    if (circlesIntersect(p1, radius1, p3, radius2)) {
        console.log("Circle around p1 intersects with circle around p3.");
        return true;
    }
    if (circlesIntersect(p1, radius1, p4, radius2)) {
        console.log("Circle around p1 intersects with circle around p4.");
        return true;
    }
    if (circlesIntersect(p2, radius1, p3, radius2)) {
        console.log("Circle around p2 intersects with circle around p3.");
        return true;
    }
    if (circlesIntersect(p2, radius1, p4, radius2)) {
        console.log("Circle around p2 intersects with circle around p4.");
        return true;
    }

    console.log("No intersection detected.");
    return false;
}

function direction(pi, pj, pk) {
    return (pk.lat - pi.lat) * (pj.lng - pi.lng) - (pj.lat - pi.lat) * (pk.lng - pi.lng);
}

function onSegment(pi, pj, pk) {
    return Math.min(pi.lat, pj.lat) <= pk.lat && pk.lat <= Math.max(pi.lat, pj.lat) &&
           Math.min(pi.lng, pj.lng) <= pk.lng && pk.lng <= Math.max(pi.lng, pj.lng);
}

function circlesIntersect(c1, r1, c2, r2) {
    const distance = haversineDistance(c1, c2);
    console.log(`Distance between circles: ${distance}, Sum of radii: ${r1 + r2}`);
    if (distance <= (r1 + r2)) {
        console.log("Already in collision state.");
        return -2; // 이미 충돌 상태
    }
    return distance <= (r1 + r2);
}

function haversineDistance(coord1, coord2) {
    const R = 6371e3; // 지구의 반지름 (미터)
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위 거리 반환
}