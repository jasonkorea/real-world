import visibilitychange from "./config.js";
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

const user = new User();

async function initMap() {

  // GPS를 시작한다.
  GPS.getInstance().start();

  // 구글 맵을 로드한다.
  const { Map } = await google.maps.importLibrary("maps");
  const map = new Map(document.getElementById("map"), {
    zoom: 20,
    center: { lat: 37.5665, lng: 126.9780 },
    mapId: "ID_REAL_WORLD",
    disableDoubleClickZoom: true,
    //disable street view
    streetViewControl: false,
    //disable zoom control
    zoomControl: false,
    //disable map type control
    mapTypeControl: false,
    clickableIcons: false,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [
          {
            visibility: "off",
          },
        ],
      },
    ],
  });

  // 유저 정보를 설정한다.
  setUserInfoFromHeader(user);

  new GameMap(map, user.googleId);
  new Nav();

  // MainPanel과 Socket을 연결
  const mainPanel = MainPanel.getInstance();
  mainPanel.addListener((message) => {
    console.log("from panel :", message);
    Socket.getInstance().sendMessage(message);
  });

  Socket.getInstance().addListener((message) => {
    console.log("from server :", message);
    if (message.type === "chat") {
      console.log(`[${message.sender}] : ${message.message}`);
      mainPanel.addChat(message);
    } else if (message.type === "move") {
      const unit = GameMap.getInstance().getUnits().get(message.sender);
      if (unit) {
        GameMap.getInstance().moveUnit(message);
      } else {
        console.log("unit 없음", message.sender);
        addUnit({
          id: message.sender,
          lat: message.unitInfo.currentPosition.lat,
          lng: message.unitInfo.currentPosition.lng,
          size: 10,
          speed: 200,
          image: '../resources/pika.png'
        });
      }
    }
  });


  // MainPanel에 유저 정보를 설정한다.
  MainPanel.getInstance().setUserInfo(user.getProfileInfo());


  GameTimer.getInstance().start();

  // GPS 정보를 받아서 유닛을 생성하고 현재 위치로 이동한다.
  GPS.getInstance().getLastPosition().then(position => {
    console.log("최신 GPS 정보 받음. 지도 이동");
    GameMap.getInstance().moveToCurrentPosition();
  });

  function addUnit(info) {
    const lat = info.lat;
    const lng = info.lng;
    const size = info.size;
    const speed = info.speed;
    const image = info.image;

    const unit = GameMap.getInstance().addUnit({
      "googleId": user.googleId,
      "lat": lat,
      "lng": lng,
      "size": size,
      "speed": speed,
      "image": image
    });
    GameTimer.getInstance().addOverlay(unit);
    
    console.log("unit 추가 됨", unit);
  }

  visibilitychange((visibility) => {
    Socket.getInstance().sendMessage({
      "type": "visibilitychange",
      "sender": user.googleId,
      "visibility": visibility
    });
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

initMap();