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
    zoom: 17,
    center: { lat: 37.5665, lng: 126.9780 },
    mapId: "ID_REAL_WORLD",
    disableDoubleClickZoom: true,
    //disable street view
    streetViewControl: false,
    //disable zoom control
    //zoomControl: false,
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


  Socket.getInstance().sendMessage({type: 'serverTime'});

  //1초에 한번씩 현재 client 시간 출력..
  // setInterval(() => {
  //   mainPanel.addChat({ sender: "client", message: `${Date.now()}` });
  // }, 1000);

  Socket.getInstance().addListener((message) => {
    console.log("from server :", message);
    if (message.type === "chat") {
      console.log(`[${message.sender}] : ${message.message}`);
      mainPanel.addChat(message);
    } else if (message.type === "move") {
      const unit = GameMap.getInstance().getUnits().get(message.sender);
      if (unit) {
        console.log("unit 있음", message);

        GameMap.getInstance().moveUnit(message);
      } else {
        console.log("unit 없음", message);
        addUnit({
          id: message.sender,
          startPosition: message.unitInfo.startPosition,
          destinationPosition: message.unitInfo.destinationPosition,
          size: message.unitInfo.size,
          speed: message.unitInfo.speed,
          image: '../resources/airplane.png',
          startTime: message.unitInfo.startTime
        });
      }
    } else if (message.type === "notice") {
      mainPanel.addChat(message);
    } else if (message.type = 'serverTime') {
      GameTimer.getInstance().setServerTimeOffset(message.data - Date.now());
    }
  });


  // MainPanel에 유저 정보를 설정한다.
  MainPanel.getInstance().setUserInfo(user.getProfileInfo());


  GameTimer.getInstance().start();

  // GPS 정보를 받아서 유닛을 생성하고 현재 위치로 이동한다.
  GPS.getInstance().getLastPosition().then(position => {
    console.log("최신 GPS 정보 받음. 지도 이동");
    GameMap.getInstance().moveToCurrentPosition();
    requestInitialData();

  });

  function requestInitialData() {
    Socket.getInstance().sendMessage({
      "type": "requestInitialData",
      "sender": user.googleId
    });
  }

  function addUnit(info) {
    const startPosition = info.startPosition;
    const destinationPosition = info.destinationPosition;
    const size = info.size;
    const speed = info.speed;
    const image = info.image;

    console.log("startPosition lat lng = ", startPosition.lat, startPosition.lng);
    console.log("destinationPosition lat lng = ", destinationPosition.lat, destinationPosition.lng);
    const unit = GameMap.getInstance().addUnit({
      "googleId": info.id,
      "startPosition": { lat: startPosition.lat, lng: startPosition.lng },
      "destinationPosition": { lat: destinationPosition.lat, lng: destinationPosition.lng },
      "size": size,
      "speed": speed,
      "image": image,
      "startTime": info.startTime
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