import GPS from "./location/GPS.js";
import GameMap from "./map/Map.js";
import Socket from "./socket/Socket.js";
import GameTimer from "./anim/GameTimer.js";

import User from "./user/User.js";

import MainPanel from "./control/MainPanel.js";
import Nav from "./control/Nav.js";

import createUnitOverayClass from "./overlay/UnitOverlay.js";


let gameMap;
let map;
const user = new User();
let UnitOveray;
let gameTimer;

let unit;

async function initMap() {
  GPS.getInstance().start();
  const { Map } = await google.maps.importLibrary("maps");
  map = new Map(document.getElementById("map"), {
    zoom: 20,
    center: { lat: 37.5665, lng: 126.9780 },
    mapId: "DEMO_MAP_ID"
  });
  gameMap = new GameMap(map);

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

  // 유저 정보를 받아온다.
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

  // MainPanel에 유저 정보를 설정한다.
  MainPanel.getInstance().setUserInfo(user.getProfileInfo());

  // 타이머 시작
  startTimer();

  GPS.getInstance().getLastPosition().then(addUnit);

  map.addListener('click', (event) => {
    console.log(event);
    // const sw = gameMap.getNewPosition(event.latLng.lat(), event.latLng.lng(), -100, -100);
    // const ne = gameMap.getNewPosition(event.latLng.lat(), event.latLng.lng(), 100, 100);

    // const bounds = new google.maps.LatLngBounds(
    //   new google.maps.LatLng(sw.newLat, sw.newLng),
    //   new google.maps.LatLng(ne.newLat, ne.newLng)
    // );

    unit.move(event.latLng.lat(), event.latLng.lng());
    gameTimer.addOverlay(unit);
  });
}

function startTimer() {
  gameTimer = new GameTimer();
  gameTimer.start();
}

function addUnit(position) {
    const size = 10;
    const sw = gameMap.getNewPosition(position.coords.latitude, position.coords.longitude, -size / 2, - size / 2);
    const ne = gameMap.getNewPosition(position.coords.latitude, position.coords.longitude, size / 2, size / 2);

    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(sw.newLat, sw.newLng),
      new google.maps.LatLng(ne.newLat, ne.newLng)
    );
    UnitOveray = createUnitOverayClass();
    unit = new UnitOveray(user.googleId, bounds, '../resources/pika.png', 100);
    gameMap.addUnit(unit);
    gameTimer.addOverlay(unit);
    gameMap.moveToCurrentPosition();
}

initMap();