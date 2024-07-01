// GPS
import GPS from "./location/GPS.js";

// MAP
import GameMap from "./map/Map.js";

// SOCKET
import Socket from "./socket/Socket.js";

// ANIM
import GameTimer from "./anim/GameTimer.js";

// INFO
import User from "./user/User.js";

// GUI component
import MainPanel from "./control/MainPanel.js";
import Nav from "./control/Nav.js";

import UnitOverlay from "./overlay/UnitOverlay.js";

const user = new User();
let UnitOveray;
let gameMap;
let gameTimer;

let unit;

async function initMap() {

  // GPS를 시작한다.
  GPS.getInstance().start();

  // 구글 맵을 로드한다.
  const { Map } = await google.maps.importLibrary("maps");
  const map = new Map(document.getElementById("map"), {
    zoom: 20,
    center: { lat: 37.5665, lng: 126.9780 },
    mapId: "ID_REAL_WORLD"
  });
  gameMap = new GameMap(map);

  // Nav를 생성한다.
  new Nav();

  // MainPanel과 Socket을 연결
  const mainPanel = MainPanel.getInstance();
  const socket = Socket.getInstance();
  mainPanel.addListener((message) => {
    console.log(message);
    socket.sendMessage(message);
  });
  socket.addListener((message) => {
    console.log(`[${message.sender}] : ${message.message}`);
    mainPanel.addChat(message);
  });

  // 유저 정보를 설정한다.
  setUserInfoFromHeader(user);

  // MainPanel에 유저 정보를 설정한다.
  MainPanel.getInstance().setUserInfo(user.getProfileInfo());

  // 타이머 시작
  startTimer();

  // GPS 정보를 받아서 유닛을 생성하고 현재 위치로 이동한다.
  GPS.getInstance().getLastPosition().then(position => {
    addUnit({
      position: position,
      size: 10,
      speed: 100
    });
    gameMap.moveToCurrentPosition();
  });

  // 클릭 이벤트를 추가한다.
  gameMap.map.addListener('click', (event) => {
    console.log('clicked!', event);
    // unit이 있으면 이동시킨다.
    if (unit) {
      unit.move(event.latLng.lat(), event.latLng.lng());
    }
  });
}

// ============================================================= 

function setUserInfoFromHeader(user) {
  const body = document.querySelector('body');
  const userinfo = JSON.parse(body.dataset.userinfo);
  console.log(userinfo);
  user.setUserInfo(userinfo.displayName,
    userinfo.firstName,
    userinfo.lastName,
    userinfo.email,
    userinfo.googleId,
    userinfo.image,
    new Date(userinfo.createdAt));
}

function startTimer() {
  gameTimer = new GameTimer();
  gameTimer.start();
}

// 유닛을 맵에 추가하고 타이머에 등록한다.
function addUnit(info) {
  const sw = gameMap.getNewPosition(info.position.coords.latitude, info.position.coords.longitude, -info.size / 2, - info.size / 2);
  const ne = gameMap.getNewPosition(info.position.coords.latitude, info.position.coords.longitude, info.size / 2, info.size / 2);

  const bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(sw.newLat, sw.newLng),
    new google.maps.LatLng(ne.newLat, ne.newLng)
  );
  UnitOveray = UnitOverlay();
  unit = new UnitOveray(user.googleId, bounds, '../resources/pika.png', info.speed);
  gameMap.addUnit(unit);
  gameTimer.addOverlay(unit);
}

initMap();