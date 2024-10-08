const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const fs = require('fs');
const path = require('path');
const https = require('https');
const socketio = require('socket.io');
const dbm = require('./db/dbmanager');
const Util = require('./util/util');
const User = require('./models/UserModel');
const { collisionCheck } = require('./collisionChecker');

dotenv.config({ path: './config/config.env' });
var app = express();
const PORT = process.env.PORT || 3000;

// HTTPS 서버 설정
var sslOptions = {
  ca: fs.readFileSync(path.join(__dirname, 'SSL', 'projectj.tplinkdns.com-chain.pem')),          // 체인 파일 (또는 chain-only 파일 사용 가능)
  key: fs.readFileSync(path.join(__dirname, 'SSL', 'projectj.tplinkdns.com-key.pem')),           // 개인 키 파일
  cert: fs.readFileSync(path.join(__dirname, 'SSL', 'projectj.tplinkdns.com-crt.pem')),          // 인증서 파일
};

var server = https.createServer(sslOptions, app);
const io = socketio(server);

createWorldUser();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

// Passport 설정
require('./config/passport')(passport);

// Middleware 설정
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('views', path.join(__dirname, 'public', 'views'));
app.set('view engine', 'ejs');

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(require("./routes/index"));
app.use('/auth', require('./routes/auth'));

// 소켓 연결 처리
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit('serverTime', { currentTime: Date.now() });
  socket.emit('message', { type: 'notice', sender: 'server', message: '현재 위치를 인식중입니다. 인식 후 "내 유닛으로 이동" 버튼을 눌러주세요.' });

  // 연결 해제 이벤트 처리
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  // 클라이언트로부터 메시지 받기
  socket.on('message', async (msg) => {
    console.log('Received', msg);
    if (msg.type === 'serverTime') {
      socket.emit('message', { type: 'serverTime', data: Date.now() });
    } else if (msg.type === 'move') {
      const freshUnit = await dbm.createOrUpdateUnit(msg);
      if (!freshUnit) {
        console.log('freshUnit is null');
        return;
      }

      const units = await dbm.getAllUnits();
      console.log('unit count', units.length);
      for (let unit of units) {
        if (unit.id !== freshUnit.id) {
          const collisionTime = collisionCheck(
            {
              id: freshUnit.id,
              speed: freshUnit.speed,
              startTime: freshUnit.startTime,
              startPosition: freshUnit.startPosition,
              destinationPosition: freshUnit.destinationPosition,
              size: freshUnit.size
            },
            {
              id: unit.id,
              speed: unit.speed,
              startTime: unit.startTime,
              startPosition: unit.startPosition,
              destinationPosition: unit.destinationPosition,
              size: unit.size
            }
          );
          if (collisionTime != -1) {
            await handleCollision(freshUnit, unit, collisionTime, io);
          }
        }
      }

      console.log('freshUnit : id', freshUnit.id);
      const userName = await dbm.getDisplayNameByGoogleId(msg.sender);
      const response = {
        type: 'move',
        sender: msg.sender,
        unitInfo: {
          id: freshUnit.id,
          startPosition: { lat: parseFloat(freshUnit.startPosition.lat), lng: parseFloat(freshUnit.startPosition.lng) },
          destinationPosition: { lat: parseFloat(freshUnit.destinationPosition.lat), lng: parseFloat(freshUnit.destinationPosition.lng) },
          size: freshUnit.size,
          speed: freshUnit.speed,
          image: freshUnit.image,
          startTime: freshUnit.startTime,
          userName: userName
        }
      };
      io.emit('message', response);
    } else if (msg.type === 'chat') {
      io.emit('message', msg);
    } else if (msg.type === 'requestInitialData' ||
      (msg.type === 'visibilitychange' && msg.visibility === 'visible')) {
      const units = await dbm.getAllUnits();
      units.forEach(async unit => {
        if (!unit.startPosition.lat) {
          console.log('unit.startPosition.lat is null');
          return;
        }
        const startPosition = { lat: parseFloat(unit.startPosition.lat.toString()), lng: parseFloat(unit.startPosition.lng.toString()) };
        const destinationPosition = { lat: parseFloat(unit.destinationPosition.lat.toString()), lng: parseFloat(unit.destinationPosition.lng.toString()) };
        const userName = await dbm.getDisplayNameByGoogleId(unit.id);
        const serverTime = Date.now();
        io.emit('serverTime', { currentTime: serverTime });

        const response = {
          type: 'move',
          sender: unit.id.toString(),
          unitInfo: {
            startPosition: startPosition,
            destinationPosition: destinationPosition,
            size: unit.size,
            speed: unit.speed,
            image: unit.image,
            userName: userName,
            startTime: serverTime > unit.startTime ? unit.startTime : unit.startTime,
            fromDb: true
          }
        };
        socket.emit('message', response);
      });
    } else if (msg.type == 'serverTime') {
      socket.emit('message', { type: 'serverTime', data: Date.now() });
    }
  });
});

// 충돌 처리 함수
async function handleCollision(unit1, unit2, collisionTime, io) {
  const date = new Date(collisionTime);
  const options = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const kstTime = date.toLocaleString('ko-KR', options);
  console.log('충돌 발생 시간:', kstTime);

  // 클라이언트에 충돌 정보 전달
  io.emit('message', { type: 'collision', unit1: unit1.id, unit2: unit2.id, time: collisionTime });
}

// World User 생성 함수
async function createWorldUser() {
  const worldUser = await User.findOne({ googleId: Util.getWorldId() });
  if (worldUser) {
    console.log('worldUser exists');
  } else {
    console.log('worldUser does not exist. Creating worldUser');
    const newWorldUser = {
      googleId: Util.getWorldId(),
      displayName: 'world',
      firstName: 'world',
      lastName: 'world',
      image: 'world',
      email: 'world'
    }
    await User.create(newWorldUser);
  }
}

// HTTPS 서버 시작
server.listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});

// HTTP 서버 시작 (포트 80에서 HTTP 요청 수신)
app.listen(80, () => {
  console.log('HTTP server running on port 80');
});
