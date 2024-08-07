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

    // 유저 정보를 설정한다.
    setUserInfoFromHeader(user);

    new GameMap(user.googleId);
    new Nav();

    // MainPanel과 Socket을 연결
    const mainPanel = MainPanel.getInstance();
    mainPanel.addListener((message) => {
        console.log("from panel :", message);
        Socket.getInstance().sendMessage(message);
    });


    Socket.getInstance().sendMessage({ type: 'serverTime' });

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
            GameMap.getInstance().moveOrAddUnit(message);
        } else if (message.type === "notice") {
            mainPanel.addChat(message);
        } else if (message.type === 'serverTime') {
            GameTimer.getInstance().setServerTimeOffset(message.data - Date.now());
        } else if (message.type === 'move_missile') {
            /* empty */
        } else if (message.type === 'collision') {
            handleCollision(message.unit1, message.unit2, message.time);
        }
    });

    // MainPanel에 유저 정보를 설정한다.
    MainPanel.getInstance().setUserInfo(user.getProfileInfo());


    GameTimer.getInstance().start();

    requestInitialData();
    // GPS 정보를 받아서 유닛을 생성하고 현재 위치로 이동한다.
    GPS.getInstance().getLastPosition().then(position => {
        console.log(`최신 GPS 정보 받음. 지도 이동 : ${position.coords.latitude}, ${position.coords.longitude}`);
        MainPanel.getInstance().addChat({ sender: "GPS", message: `최신 GPS 정보 받음. 지도 이동 : ${position.coords.latitude}, ${position.coords.longitude}` });
        GameMap.getInstance().moveToCurrentPosition();
    });

    function requestInitialData() {
        Socket.getInstance().sendMessage({
            "type": "requestInitialData",
            "sender": user.googleId
        });
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

// 유닛의 충돌을 처리하는 함수
const handleCollision = (unit1Id, unit2Id, collisionTime) => {
    console.log(`Collision detected between unit ${unit1Id} and unit ${unit2Id} at time ${collisionTime}`);
};


initMap();